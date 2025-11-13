import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events'; // Import EventEmitter
import { ENV } from '../config/env';
import { abi } from '../polymarket/abi';
import logger from '../utils/logger';

const WSS_URL = ENV.WSS_URL;
const polymarketAddress = ENV.POLYMARKET_CONTRACT_ADDRESS.toLowerCase();

class TradeMonitor extends EventEmitter {
    async start(TARGET_WALLET: string) {
        try {
            const wssProvider = new ethers.providers.WebSocketProvider(WSS_URL);
            const iface = new ethers.utils.Interface(abi);

            // Listen for new blocks
            wssProvider.on('block', async (blockNumber) => {
                try {         
                    // console.log(`New block detected: ${blockNumber}`);
                    const block = await wssProvider.getBlockWithTransactions(blockNumber);
                    
                    // Process each transaction in the block
                    for (const tx of block.transactions) {

                        const to = tx.to && tx.to.toLowerCase();

                        // Filter: Only process transactions sent to the Polymarket contract
                        if (to !== polymarketAddress) {
                            continue;
                        }

                        // Filter: Skip transactions with empty or invalid data
                        if (!tx.data || tx.data === '0x' || tx.data.length < 10) {
                            continue;
                        }

                        let orderData;
                        try {
                            orderData = iface.parseTransaction({ data: tx.data });
                            // eslint-disable-next-line no-unused-vars
                        } catch (decodeError) {
                            // Silently skip if decoding fails - this is expected for transactions
                            // that don't match the Polymarket ABI (e.g., other contract functions)
                            continue;
                        }

                        // Extract takerOrder
                        const takerOrder = orderData.args[0];
                        const takerOrderData = {
                            salt: BigNumber.from(takerOrder[0].hex || takerOrder[0]._hex),
                            maker: takerOrder[1],
                            signer: takerOrder[2],
                            taker: takerOrder[3],
                            tokenId: BigNumber.from(takerOrder[4].hex || takerOrder[4]._hex),
                            makerAmount: BigNumber.from(takerOrder[5].hex || takerOrder[5]._hex),
                            takerAmount: BigNumber.from(takerOrder[6].hex || takerOrder[6]._hex),
                            expiration: BigNumber.from(takerOrder[7].hex || takerOrder[7]._hex),
                            nonce: BigNumber.from(takerOrder[8].hex || takerOrder[8]._hex),
                            feeRateBps: BigNumber.from(takerOrder[9].hex || takerOrder[9]._hex),
                            side: takerOrder[10],
                            signatureType: takerOrder[11],
                            signature: takerOrder[12],
                        };

                        if (takerOrder.maker.toLowerCase() !== TARGET_WALLET.toLowerCase()) continue;

                        // Extract makerOrders
                        const makerOrders = orderData.args[1]; // Array of orders
                        const makerOrdersData = makerOrders.map((order: any[]) => ({
                            salt: BigNumber.from(order[0].hex || order[0]._hex),
                            maker: order[1],
                            signer: order[2],
                            taker: order[3],
                            tokenId: BigNumber.from(order[4]?.hex || order[4]._hex),
                            makerAmount: BigNumber.from(order[5].hex || order[5]._hex),
                            takerAmount: BigNumber.from(order[6].hex || order[6]._hex),
                            expiration: order[7].hex || order[7]._hex,
                            nonce: BigNumber.from(order[8].hex || order[8]._hex),
                            feeRateBps: BigNumber.from(order[9].hex || order[9]._hex),
                            side: order[10],
                            signatureType: order[11],
                            signature: order[12],
                        }));

                        const receipt = await wssProvider.getTransactionReceipt(tx.hash);
                        if (receipt && receipt.status !== 1) continue;

                        // // Emit an event with the decoded transaction data
                        this.emit('transaction', {
                            blockNumber,
                            transactionHash: tx.hash,
                            tokenId: takerOrderData.tokenId.toString(),
                            side: takerOrderData.side,
                            makerAmount: takerOrderData.makerAmount.toString(),
                            takerAmount: takerOrderData.takerAmount.toString(),
                        });
                    }
                } catch (error) {
                    logger.error(`Error processing block ${blockNumber}:`, error);
                }
            });

            // Handle WebSocket errors
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            wssProvider._websocket.on('error', (error: any) => {
                logger.error('WebSocket error:', error);
                this.emit('error', error); // Emit an error event
            });

            // Handle WebSocket close events
            wssProvider._websocket.on('close', (code: number, reason: string) => {
                logger.error(`WebSocket closed: Code ${code}, Reason: ${reason}`);
                this.emit('close', { code, reason }); // Emit a close event
            });
        } catch (error) {
            console.error('An error occurred:', error);
            this.emit('error', error); // Emit an error event
        }
    }
}

export default TradeMonitor;
