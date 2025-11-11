import readline from 'readline';
import connectDB from './config/db';
import createClobClient from './utils/createClobClient';
import { ClobClient } from '@polymarket/clob-client';
import ora from 'ora';
import test from './test/test';
import TradeMonitor from './services/tradeMonitor';
import tradeExecutor from './services/tradeExecutor';
import { TradeParams } from './interfaces/tradeInterfaces';

const promptUser = async (): Promise<TradeParams> => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log(
        'hey, I’m going to go into monitor mode for a few days, what parameters should I use the whole time I’m running?'
    );

    const question = (query: string): Promise<string> =>
        new Promise((resolve) => rl.question(query, resolve));

    const targetWallet = await question('Enter target wallet address: ');
    const copyRatio = parseInt(
        await question('Enter your wanted ratio (fraction): '),
        10
    );
    const retryLimit = parseInt(await question('Enter retry limit: '), 10);
    const orderTimeout = parseInt(
        await question('Enter order timeout (in seconds): '),
        10
    );
    const orderIncrement = parseInt(
        await question('rement (in cents): '),
        10
    );

    rl.close();

    return {
        targetWallet,
        copyRatio,
        retryLimit,
        orderIncrement,
        orderTimeout,
    };
};

export const main = async () => {
    // await test();
    const connectDBSpinner = ora('Connecting DB...').start();
    await connectDB();
    connectDBSpinner.succeed('Connected to MongoDB.\n');
    const createClobClientSpinner = ora('Creating ClobClient...').start();
    const clobClient = await createClobClient();
    createClobClientSpinner.succeed('ClobClient created\n');
    const params = await promptUser();
    
    const monitor = new TradeMonitor();
    monitor.on('transaction', (data) => {
        tradeExecutor(clobClient, data, params);
        // botStartSpinner.succeed('Bot started\n');
    });
    monitor.start(params.targetWallet);
};

main();
