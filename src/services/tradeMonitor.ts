import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events'; // Import EventEmitter
import { getPolyMarketModel } from '../models/PolyMarket';
import { ENV } from '../config/env';
import { abi } from '../polymarket/abi';

const WSS_URL = ENV.WSS_URL;

class TradeMonitor extends EventEmitter {
    async start(TARGET_WALLET: string) {
        try {
            const wssProvider = new ethers.providers.WebSocketProvider(WSS_URL);
            const iface = new ethers.utils.Interface(abi);

            console.log('Listening for new blocks...');

            // Listen for new blocks
            wssProvider.on('block', async (blockNumber) => {
                try {
                    // console.log(`New block detected: ${blockNumber}`);
                    const block = await wssProvider.getBlockWithTransactions(blockNumber);

                    // Process each transaction in the block
                    for (const tx of block.transactions) {
                        let decodedData;
                        try {
                            decodedData = iface.parseTransaction({ data: tx.data });
                            // eslint-disable-next-line no-unused-vars
                        } catch (decodeError) {
                            continue; // Skip if decoding fails
                        }

                        const args = [decodedData.args[0]];
                        decodedData.args[1].map((arg: any) => {
                            args.push(arg);
                        })
                        // console.log(args);

                        const found_arg = args.find((arg) => arg.maker.toLocaleLowerCase() === TARGET_WALLET.toLocaleLowerCase());
                        if (!found_arg) continue;

                        const receipt = await wssProvider.getTransactionReceipt(tx.hash);
                        if (receipt && receipt.status !== 1) continue;

                        const tokenId = BigNumber.from(found_arg.tokenId).toString();
                        const side = BigNumber.from(found_arg.side).toNumber();
                        const makerAmount = BigNumber.from(
                            found_arg.makerAmount
                        ).toNumber();
                        const takerAmount = BigNumber.from(
                            found_arg.takerAmount
                        ).toNumber();

                        // Emit an event with the decoded transaction data
                        this.emit('transaction', {
                            blockNumber,
                            transactionHash: tx.hash,
                            tokenId,
                            side,
                            makerAmount,
                            takerAmount,
                        });
                    }
                } catch (error) {
                    console.error(`Error processing block ${blockNumber}:`, error);
                }
            });

            // Handle WebSocket errors
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            wssProvider._websocket.on('error', (error: any) => {
                console.error('WebSocket error:', error);
                this.emit('error', error); // Emit an error event
            });

            // Handle WebSocket close events
            wssProvider._websocket.on('close', (code: number, reason: string) => {
                console.error(`WebSocket closed: Code ${code}, Reason: ${reason}`);
                this.emit('close', { code, reason }); // Emit a close event
            });
        } catch (error) {
            console.error('An error occurred:', error);
            this.emit('error', error); // Emit an error event
        }
    }
}

export default TradeMonitor;
