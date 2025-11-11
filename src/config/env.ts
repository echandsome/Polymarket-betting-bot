import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.PUBLIC_ADDRESS) {
    throw new Error('USER_ADDRESS is not defined');
}
if (!process.env.PROXY_WALLET) {
    throw new Error('PROXY_WALLET is not defined');
}
if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY is not defined');
}
if (!process.env.CLOB_HTTP_URL) {
    throw new Error('CLOB_HTTP_URL is not defined');
}
if (!process.env.CLOB_WS_URL) {
    throw new Error('CLOB_WS_URL is not defined');
}
if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined');
}
if (!process.env.RPC_URL) {
    throw new Error('RPC_URL is not defined');
}
if (!process.env.WSS_URL) {
    throw new Error('WSS_URL is not defined');
}
if (!process.env.USDC_CONTRACT_ADDRESS) {
    throw new Error('USDC_CONTRACT_ADDRESS is not defined');
}
if (!process.env.POLYMARKET_CONTRACT_ADDRESS) {
    throw new Error('POLYMARKET_CONTRACT_ADDRESS is not defined');
}

export const ENV = {
    PUBLIC_ADDRESS: process.env.PUBLIC_ADDRESS as string,
    PROXY_WALLET: process.env.PROXY_WALLET as string,
    PRIVATE_KEY: process.env.PRIVATE_KEY as string,
    CLOB_HTTP_URL: process.env.CLOB_HTTP_URL as string,
    CLOB_WS_URL: process.env.CLOB_WS_URL as string,
    RPC_URL: process.env.RPC_URL as string,
    WSS_URL: process.env.WSS_URL as string,
    USDC_CONTRACT_ADDRESS: process.env.USDC_CONTRACT_ADDRESS as string,
    POLYMARKET_CONTRACT_ADDRESS: process.env.POLYMARKET_CONTRACT_ADDRESS as string,
    MONGO_URI: 'mongodb+srv://KingCode0624:Password123@cluster0.xrjllyw.mongodb.net/',
};
