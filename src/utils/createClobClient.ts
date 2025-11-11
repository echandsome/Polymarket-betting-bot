import { ethers } from 'ethers';
import { ClobClient } from '@polymarket/clob-client';
import { getPolyMarketModel } from '../models/PolyMarket';
import { SignatureType } from '@polymarket/order-utils';
import { ENV } from '../config/env';

const Acc_adr = ENV.PROXY_WALLET as string;
const Pvr_adr = ENV.PRIVATE_KEY as string;
const CLOB_HTTP_URL = ENV.CLOB_HTTP_URL as string;

const createClobClient = async (): Promise<ClobClient> => {
    const chainId = 137;
    const host = CLOB_HTTP_URL;
    const wallet = new ethers.Wallet(Pvr_adr);
    let clobClient = new ClobClient(
        host,
        chainId,
        wallet,
        undefined,
        SignatureType.POLY_PROXY,
        Acc_adr
    );

    try {
        const originalConsoleError = console.error;
        console.error = function () { };
        let creds = await clobClient.createApiKey();
        console.error = originalConsoleError;

        if (!creds || !creds.key) {
            creds = await clobClient.deriveApiKey();
            console.log('API Key derived', creds);
        } else {
            console.log('API Key created', creds);
        }

        clobClient = new ClobClient(
            host,
            chainId,
            wallet,
            creds,
            SignatureType.POLY_PROXY,
            Acc_adr as string
        );

        const PolyMarket = getPolyMarketModel();
        // Serialize the clobClient to store in MongoDB
        // Note: We're storing a string representation since MongoDB can't store complex objects directly
        const clobClientString = JSON.stringify({
            host: clobClient.host,
            chainId: clobClient.chainId,
            apiKey: creds ? creds.key : null,
            apiSecret: creds ? creds.secret : null,
            signatureType: SignatureType.POLY_PROXY,
            proxyWallet: Acc_adr
        });
        // Check if a record with this wallet already exists
        const existingRecord = await PolyMarket.findOne({ account_adr: Acc_adr });

        if (!existingRecord) {
            // Create new record
            await PolyMarket.create({
                account_adr: Acc_adr,
                pvr_adr: Pvr_adr,
                clobclient: clobClientString
            });
            console.log('ClobClient data saved to MongoDB successfully');
        } else {
            console.log('ClobClient data already exists in MongoDB');
        }
        return clobClient;
    } catch (error) {
        console.error('Error in createClobClient:', error);
        throw error;
    }
};

export default createClobClient;
