# Polymarket Trade Copier

## Professional Trading Bot for Automated Position Mirroring

A sophisticated trading application that monitors and replicates trading positions from specified wallets on Polymarket, with advanced execution parameters and risk management features.

## Project Overview

The Polymarket Trade Copier is an enterprise-grade trading bot designed to observe and replicate trading activities from target wallets on the Polymarket platform. It leverages blockchain event monitoring to detect trades in real-time and executes similar positions with configurable parameters through the Polymarket Central Limit Order Book (CLOB) API.

This solution is ideal for traders looking to:
- Mirror successful trading strategies from proven market participants
- Automate position taking with customizable execution parameters
- Implement sophisticated order execution strategies with fallback mechanisms

## Core Capabilities

### Market Monitoring
- **Blockchain Event Tracking**: Monitors the Ethereum blockchain for specific trading events from target wallets
- **Transaction Validation**: Verifies successful transactions before attempting to copy positions
- **Real-time Data Processing**: Processes block data to extract relevant trade information including token IDs, sides, and amounts

### Trade Execution
- **Parameterized Position Sizing**: Configurable ratio-based position sizing relative to the target wallet
- **Multi-stage Execution Strategy**: Implements a three-tiered approach to order placement with progressive price adjustments
- **Intelligent Retry Logic**: Automatically retries failed orders with optimized parameters
- **Order Lifecycle Management**: Monitors order status and cancels partially filled orders when necessary

### Configuration & Customization
- **Interactive Setup**: User-friendly command-line interface for configuring trading parameters
- **Flexible Execution Parameters**: Customizable timeouts, price adjustments, and retry limits
- **Balance Verification**: Integrates with USDC contract to verify sufficient funds before execution

## Technical Architecture

The application is built on a modular architecture with the following components:

- **Trade Monitor**: Listens for blockchain events and detects relevant trades
- **Trade Executor**: Handles order creation, submission, and management
- **CLOB Client**: Interfaces with the Polymarket API for order execution
- **Database Integration**: Stores trade data for analysis and record-keeping
- **Configuration Management**: Securely manages API credentials and trading parameters

## Implementation Details

### Order Execution Strategy

The bot employs a sophisticated three-phase execution strategy:

1. **Primary Execution Phase**:
   - Places an initial order mirroring the target's price point
   - Waits for a configurable timeout period for the order to fill
   - Proceeds to secondary phase if the order remains unfilled

2. **Secondary Adjustment Phase**:
   - Adjusts price by a configurable increment to improve fill probability
   - Slightly reduces position size to manage risk
   - Implements a separate timeout period for this phase

3. **Final Execution Phase**:
   - Makes a final price adjustment to maximize fill probability
   - Further reduces position size
   - Represents the last attempt to execute the trade

### Risk Management

- **Minimum Size Enforcement**: Ensures orders meet minimum size requirements
- **Value Thresholds**: Skips execution for trades below configurable value thresholds
- **Balance Verification**: Checks USDC balance before attempting trades
- **Position Sizing**: Implements proportional position sizing relative to target trades

## Setup & Configuration

### Prerequisites
- Node.js (v14+)
- Ethereum wallet with sufficient USDC balance
- Polymarket API credentials
- Access to Polygon RPC and WebSocket endpoints

### Environment Configuration
Create a `.env` file with the following parameters:
```
RPC_URL=https://polygon-rpc.com
WSS_URL=wss://polygon-ws.com
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
CLOB_CONTRACT_ADDRESS=<polymarket_clob_contract_address>
PRIVATE_KEY=<your_private_key>
POLY_API_KEY=<your_polymarket_api_key>
POLY_PASSPHRASE=<your_polymarket_passphrase>
```

### Installation & Deployment
```bash
# Clone repository
git clone https://github.com/yourusername/polymarket-trade-copier.git
cd polymarket-trade-copier

# Install dependencies
npm install

# Build the application
npm run build

# Start the trading bot
npm start
```

### Trading Parameters Configuration
During startup, you'll be prompted to configure:

| Parameter | Description | Recommendation |
|-----------|-------------|----------------|
| `targetWallet` | Wallet address to monitor | Use addresses with proven trading history |
| `copyRatio` | Position size ratio (0-1) | Start with lower values (0.1-0.3) for risk management |
| `retryLimit` | Maximum retry attempts | 3-5 is typically sufficient |
| `initialOrderTimeout` | First attempt timeout (seconds) | 30-60 seconds recommended |
| `secondOrderIncrement` | Price adjustment for second attempt (cents) | 1-3 cents depending on market volatility |
| `secondOrderTimeout` | Second attempt timeout (seconds) | 20-40 seconds recommended |
| `finalOrderIncrement` | Price adjustment for final attempt (cents) | 2-5 cents for maximum fill probability |
| `finalOrderTimeout` | Final attempt timeout (seconds) | 15-30 seconds recommended |

## Troubleshooting & Maintenance

### Common Issues

#### Insufficient Balance/Allowance
If you encounter "not enough balance / allowance" errors:
```bash
# Run the token approval script
npx ts-node src/scripts/runApproval.ts
```
This grants the CLOB contract permission to use your USDC for trading.

#### Invalid Order Payload
This typically indicates:
- Incorrect API credentials
- Attempting to cancel non-existent orders
- Malformed order parameters

Verify your API credentials and check the order parameters being submitted.

### Ongoing Maintenance
- Monitor USDC balance regularly
- Update API credentials when necessary
- Periodically review target wallet performance
- Adjust trading parameters based on market conditions

## Security Best Practices

- Store private keys in secure environment variables
- Use a dedicated trading wallet with limited funds
- Implement IP restrictions on API access where possible
- Never commit credentials to version control
- Regularly rotate API credentials

## Legal Disclaimer

This software is provided for educational and informational purposes only. Trading cryptocurrency involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Users should conduct their own research and consult financial advisors before engaging in trading activities.

## License

MIT
