import { BigNumber, ethers } from 'ethers';
import { ENV } from '../config/env';
import { abi } from '../polymarket/abi';

const WSS_URL = ENV.WSS_URL;
const TARGET_WALLET = '';

const test = async () => {
    try {
        const wssProvider = new ethers.providers.WebSocketProvider(WSS_URL);

        const iface = new ethers.utils.Interface(abi);

        console.log('Listening for new blocks...');

        // Listen for new blocks
        wssProvider.on('block', async (blockNumber) => {
            try {
                console.log(`New block detected: ${blockNumber}`);
                const block = await wssProvider.getBlockWithTransactions(blockNumber);

                // Process each transaction in the block
                for (const tx of block.transactions) {
                    let decodedData;
                    try {
                        decodedData = iface.parseTransaction({ data: tx.data });
                        // eslint-disable-next-line no-unused-vars
                    } catch (decodeError) {
                        continue;
                    }
                    if (decodedData.args[0].maker !== TARGET_WALLET) continue;
                    const receipt = await wssProvider.getTransactionReceipt(tx.hash);
                    if (receipt && receipt.status !== 1) continue;
                    const tokenId = BigNumber.from(decodedData.args[0].tokenId).toString();
                    const side = BigNumber.from(decodedData.args[0].side).toNumber();
                    const makerAmount = BigNumber.from(decodedData.args[0].makerAmount).toNumber();
                    const takerAmount = BigNumber.from(decodedData.args[0].takerAmount).toNumber();

                    console.log('Token ID:', tokenId);
                    console.log('side', side);
                    console.log('Taker Amount:', takerAmount);
                    console.log('Maker Amount:', makerAmount);
                }
            } catch (error) {
                console.error(`Error processing block ${blockNumber}:`, error);
            }
        });
    } catch (error) {
        console.error('An error occurred:', error);
    }
};

export default test;
