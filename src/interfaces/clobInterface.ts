import { OrderResponse } from '@polymarket/clob-client';

export interface IPlacedOrderResponse extends OrderResponse {}

export interface ICanceledOrders {
    canceled?: string[];
    message?: string;
}

