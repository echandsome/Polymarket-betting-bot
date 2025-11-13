import { ethers } from 'ethers';
import { ApiKeyCreds, ApiKeysResponse, ClobClient, OpenOrder, OpenOrdersResponse, OrderScoring, OrderType } from '@polymarket/clob-client';
import { ICanceledOrders, IPlacedOrderResponse } from '../interfaces/clobInterface';
import { ENV } from '../config/env';
import { getPolyMarketModel } from '../models/PolyMarket';
import { SignatureType } from '@polymarket/order-utils';

class ClobService {
    private clobClient: ClobClient | null = null;
    private clobRpcUrl: string;
    private privateKey: string;

    constructor(clobRpcUrl: string, privateKey: string) {
        this.clobRpcUrl = clobRpcUrl;
        this.privateKey = privateKey;
    }

    private async getClobClient(): Promise<ClobClient> {
        if (this.clobClient) {
            return this.clobClient;
        }

        // Create a provider from the RPC URL
        const provider = new ethers.providers.JsonRpcProvider(ENV.RPC_URL);
        // Create wallet and connect it to the provider
        const wallet = new ethers.Wallet(this.privateKey, provider);
        const chainId = await wallet.getChainId();
        
        // Ensure wallet address is checksummed
        const walletAddress = ethers.utils.getAddress(ENV.PROXY_WALLET);
        
        // Try to retrieve stored API credentials from MongoDB
        const PolyMarket = getPolyMarketModel();
        const existingRecord = await PolyMarket.findOne({ account_adr: walletAddress });
        
        let creds: ApiKeyCreds | undefined = undefined;
        
        if (existingRecord && existingRecord.clobclient) {
            try {
                const clobClientData = JSON.parse(existingRecord.clobclient);
                if (clobClientData.apiKey && clobClientData.apiSecret) {
                    creds = {
                        key: clobClientData.apiKey,
                        secret: clobClientData.apiSecret,
                        passphrase: clobClientData.passphrase || '' // Use stored passphrase or empty string
                    };
                }
            } catch (error) {
                console.warn('Failed to parse stored API credentials, will create new ones');
            }
        }
        
        // If no credentials found, create or derive them
        if (!creds || !creds.key) {
            // Create a temporary ClobClient without credentials to create API keys
            let tempClobClient = new ClobClient(
                this.clobRpcUrl,
                chainId,
                wallet,
                undefined,
                SignatureType.EOA,
                walletAddress
            );
            
            try {
                const originalConsoleError = console.error;
                console.error = function () { };
                creds = await tempClobClient.createApiKey();
                console.error = originalConsoleError;
                
                if (!creds || !creds.key) {
                    creds = await tempClobClient.deriveApiKey();
                }
            } catch (error) {
                console.error('Error creating/deriving API key:', error);
                throw error;
            }
        }
        
        // Create ClobClient with credentials
        this.clobClient = new ClobClient(
            this.clobRpcUrl,
            chainId,
            wallet,
            creds,
            SignatureType.EOA,
            walletAddress
        );

        return this.clobClient;
    }

    async createApiKey(): Promise<ApiKeyCreds> {
        const clobClient = await this.getClobClient();
        const creds = await clobClient.createApiKey();
        return creds;
    }

    async getApiKey(): Promise<ApiKeysResponse> {
        const clobClient = await this.getClobClient();
        const creds = await clobClient.getApiKeys();
        return creds;
    }

    async deleteApiKey(): Promise<string> {
        const clobClient = await this.getClobClient();
        const resp = await clobClient.deleteApiKey();
        return resp;
    }

    async placeOrder(
        tokenID: string,
        price: number,
        side: string,
        size: number,
        feeRateBps: number,
        nonce: number
    ): Promise<IPlacedOrderResponse> {
        try {
            const clobClient = await this.getClobClient();
            const order = await clobClient.createOrder({
                tokenID,
                price,
                side: side as any,
                size,
                feeRateBps,
                nonce
            });
            const resp = await clobClient.postOrder(order, OrderType.GTC);
            return resp;
        } catch (error) {
            throw error;
        }
    }

    async getOrder(orderID: string): Promise<OpenOrder> {
        try {
            const clobClient = await this.getClobClient();
            const order = await clobClient.getOrder(orderID);
            return order;
        } catch (error: any) {
            throw error;
        }
    }

    async isOrderScoring(orderID: string): Promise<OrderScoring> {
        try {
            const clobClient = await this.getClobClient();
            const scoring = await clobClient.isOrderScoring({ order_id: orderID });
            return scoring;
        } catch (error: any) {
            throw error;
        }
    }

    async getActiveOrders(market: string): Promise<OpenOrdersResponse> {
        try {
            const clobClient = await this.getClobClient();
            const orders = await clobClient.getOpenOrders({ market });
            return orders;
        } catch (error: any) {
            throw error;
        }
    }

    async cancelOrder(orderID: string): Promise<string> {
        try {
            const clobClient = await this.getClobClient();
            const resp = await clobClient.cancelOrder({ orderID });
            return resp;
        } catch (error: any) {
            throw error;
        }
    }

    async cancelAllOrders(): Promise<ICanceledOrders> {
        try {
            const clobClient = await this.getClobClient();
            const resp = await clobClient.cancelAll();
            return resp;
        } catch (error: any) {
            throw error;
        }
    }
}

export default ClobService;

