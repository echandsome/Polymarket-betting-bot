import * as dotenv from 'dotenv';
dotenv.config();

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
    
    // 🎯 YOUR TRADING WALLET: This is YOUR wallet address that will execute trades
    // - Must have USDC balance for trading
    // - Used by CLOB client to sign and place orders
    // - This wallet receives profits/losses from copied trades
    PROXY_WALLET: process.env.PROXY_WALLET as string,
    
    // 🔐 PRIVATE KEY: Private key corresponding to PROXY_WALLET
    // - Used to sign transactions for your trading wallet
    // - MUST match PROXY_WALLET address
    // - ⚠️ KEEP SECRET - Never share or commit to version control
    PRIVATE_KEY: process.env.PRIVATE_KEY as string,
    
    // 🌐 Polymarket API Endpoints
    CLOB_HTTP_URL: process.env.CLOB_HTTP_URL as string, // HTTP endpoint for Polymarket CLOB API
    CLOB_WS_URL: process.env.CLOB_WS_URL as string, // WebSocket endpoint for Polymarket CLOB
    
    // 🔗 Blockchain Connection Endpoints (Polygon Network)
    RPC_URL: process.env.RPC_URL as string, // HTTP RPC endpoint (e.g., Alchemy, Infura)
    WSS_URL: process.env.WSS_URL as string, // WebSocket RPC endpoint (for real-time block monitoring)
    
    // 📄 Smart Contract Addresses (Polygon Mainnet)
    USDC_CONTRACT_ADDRESS: process.env.USDC_CONTRACT_ADDRESS as string, // USDC token contract
    POLYMARKET_CONTRACT_ADDRESS: process.env.POLYMARKET_CONTRACT_ADDRESS as string, // Polymarket main contract
    
    // 💾 Database Connection
    MONGO_URI: process.env.MONGO_URI as string, // MongoDB connection string
};

// 📝 NOTE: The wallet you FOLLOW/MONITOR is NOT in environment variables.
// It is entered interactively at runtime when you start the bot.
// See src/index.ts line 24: `const targetWallet = await question('Enter target wallet address: ');`
