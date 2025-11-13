import { ethers } from 'ethers';
import { ENV } from '../config/env';

const RPC_URL = ENV.RPC_URL;
const USDC_CONTRACT_ADDRESS = ENV.USDC_CONTRACT_ADDRESS;

const USDC_ABI = ['function balanceOf(address owner) view returns (uint256)'];

// Polygon network configuration (chainId: 137)
const POLYGON_NETWORK = {
    name: 'matic',
    chainId: 137,
};

const getMyBalance = async (address: string): Promise<number> => {
    // Validate address format to ensure it's not an ENS name
    if (!ethers.utils.isAddress(address)) {
        throw new Error(`Invalid address format: ${address}. Must be a valid Ethereum address (0x...).`);
    }

    // Create provider with explicit Polygon network to prevent ENS resolution
    const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL, POLYGON_NETWORK);
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, rpcProvider);
    const balance_usdc = await usdcContract.balanceOf(address);
    const balance_usdc_real = ethers.utils.formatUnits(balance_usdc, 6);
    return parseFloat(balance_usdc_real);
};

export default getMyBalance;
