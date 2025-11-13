import { Side } from '@polymarket/clob-client';
import { TradeData, TradeParams } from '../interfaces/tradeInterfaces';
import { ENV } from '../config/env';
import logger from '../utils/logger';
import ClobService from './clobService';

const clobService = new ClobService(ENV.CLOB_HTTP_URL, ENV.PRIVATE_KEY);

const tradeExecutor = async (data: TradeData, params: TradeParams) => {
    
    logger.info('\n------------------------------------------\n New trade executing process: ', data);

    const side = data.side ? Side.SELL : Side.BUY;

    if (side === Side.SELL) {
        return;
    }

    const tokenID = data.tokenId;
    let price = data.side
        ? data.takerAmount / data.makerAmount
        : data.makerAmount / data.takerAmount;
    let size = data.side ? data.makerAmount / 1000000 * params.copyRatio + 0.01 : data.takerAmount / 1000000 * params.copyRatio + 0.01;

    if (size < 5) {
        size = 5;
    }
    if (size * price < 1) {
        size = 1 / price + 0.01;
    }

    logger.info(`side: ${side}, tokenID: ${tokenID}, price: ${price}, size: ${size}`);

    // Helper function to detect Cloudflare blocks
    const isCloudflareBlock = (response: any): boolean => {
        if (!response) return false;
        
        // Check if response has an error field with HTML/Cloudflare content
        if (response.error && typeof response.error === 'string') {
            const errorStr = response.error.toLowerCase();
            return errorStr.includes('cloudflare') || 
                   errorStr.includes('attention required') ||
                   errorStr.includes('sorry, you have been blocked') ||
                   errorStr.includes('<!doctype html>');
        }
        
        // Check if response itself is HTML
        if (typeof response === 'string' && response.toLowerCase().includes('cloudflare')) {
            return true;
        }
        
        return false;
    };

    const executeOrder = async (price: number, size: number, timeout: number): Promise<boolean> => {
        try {
            // Generate a nonce for the order (using timestamp)
            const nonce = Date.now();
            
            const response = await clobService.placeOrder(
                tokenID,
                price,
                side, // Side.BUY or Side.SELL (string enum)
                size,
                0, // feeRateBps - can be adjusted if needed
                nonce
            );
            logger.info('Order response:', response);

            // Check for Cloudflare block
            if (isCloudflareBlock(response)) {
                logger.error('❌ Cloudflare blocked the request. This may be temporary. Consider:');
                logger.error('   1. Adding delays between requests');
                logger.error('   2. Using a different IP/proxy');
                logger.error('   3. Checking if your IP is whitelisted');
                return false;
            }

            if (!response || !response.success) {
                logger.error('Order posting failed. Response:', response);
                return false;
            }

            await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
            const orderStatus = await clobService.getOrder(response.orderID);
            if (orderStatus.original_size === orderStatus.size_matched) {
                logger.info('Order completed successfully 🎉:', response.orderID);
                return true;
            }

            await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
            await clobService.cancelOrder(response.orderID);
            logger.info('Order partially filled and canceled ❌:', response.orderID);
            return false;
        } catch (error) {
            console.log(error)
            logger.error('Error during order execution ❗:', error);
            return false;
        }
    };

    for (let attempt = 1; attempt <= params.retryLimit; attempt++) {
        // Attempt  order
        logger.info(
            `✅ Attempt ${attempt} of ${params.retryLimit} for price: ${price}, size: ${size}`
        );
        
        // Add delay between attempts to avoid rate limiting/Cloudflare blocks
        if (attempt > 1) {
            const delayMs = Math.min(1000 * attempt, 10000); // Max 10 seconds
            logger.info(`⏳ Waiting ${delayMs / 1000}s before retry to avoid rate limits...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        
        if (await executeOrder(price, size, params.orderTimeout)) return;
        price = data.side
            ? price - params.orderIncrement / 100
            : price + params.orderIncrement / 100;
        if (price < 0) break;
        // size = size - size * (params.orderIncrement / 100);
    }

    logger.info(`🔥 All ${params.retryLimit} attempts failed.`);
};

export default tradeExecutor;