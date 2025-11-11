import mongoose, { Schema } from 'mongoose';

const PolyMarketSchema = new Schema({
    asset: { type: String, required: false },
    enable_order_book: { type: Boolean, required: false },
    active: { type: Boolean, required: false },
    closed: { type: Boolean, required: false },
    archived: { type: Boolean, required: false },
    accepting_orders: { type: Boolean, required: false },
    accepting_order_timestamp: { type: Date, default: null },
    minimum_order_size: { type: Number, required: false },
    minimum_tick_size: { type: Number, required: false },
    condition_id: { type: String, required: false },
    question_id: { type: String, required: false },
    question: { type: String, required: false },
    description: { type: String, required: false },
    market_slug: { type: String, required: false },
    end_date_iso: { type: Date, required: false },
    game_start_time: { type: Date, required: false },
    seconds_delay: { type: Number, required: false },
    fpmm: { type: String, required: false },
    maker_base_fee: { type: Number, required: false },
    taker_base_fee: { type: Number, required: false },
    notifications_enabled: { type: Boolean, required: false },
    neg_risk: { type: Boolean, required: false },
    neg_risk_market_id: { type: String, default: '' },
    neg_risk_request_id: { type: String, default: '' },
    icon: { type: String, required: false },
    image: { type: String, required: false },
    rewards: {
        rates: { type: Schema.Types.Mixed, default: null },
        min_size: { type: Number, required: false },
        max_spread: { type: Number, required: false },
    },
    is_50_50_outcome: { type: Boolean, required: false },
    tokens: [
        {
            token_id: { type: String, required: false },
            outcome: { type: String, required: false },
            price: { type: Number, required: false },
            winner: { type: Boolean, required: false },
        },
    ],
    tags: [{ type: String, required: false }],
    // Add new fields for clob client data
    account_adr: { type: String, required: false },
    pvr_adr: { type: String, required: false },
    clobclient: { type: String, required: false },
    // Add transactions field to store transaction data
    transactions: [{
        blockNumber: { type: Number, required: false },
        transactionHash: { type: String, required: true, index: true },
        tokenId: { type: String, required: false },
        side: { type: String, required: false },
        makerAmount: { type: String, required: false },
        takerAmount: { type: String, required: false },
        timestamp: { type: Date, default: Date.now }
    }]
});


// Export the model
const PolyMarket = mongoose.model('PolyMarket', PolyMarketSchema);

// Function to get the model
export const getPolyMarketModel = () => {
    return PolyMarket;
};

export default PolyMarket;
