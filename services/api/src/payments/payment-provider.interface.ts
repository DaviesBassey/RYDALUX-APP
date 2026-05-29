export interface PaymentInitializationRequest {
  userId: string;
  tripId: string;
  email: string;
  amount: string;
  currency: string;
}

export interface PaymentInitializationResponse {
  payment: {
    id: string;
    tripId: string;
    amount: string;
    currency: string;
    status: string;
    reference: string;
    provider: string;
    createdAt: Date;
  };
  authorizationUrl: string | null;
  accessCode?: string;
}

export interface PaymentVerificationResponse {
  id: string;
  status: string;
  reference: string;
  amount: number;
  channel: string;
  currency: string;
  gatewayResponse: string;
  authorizationCode?: string;
  cardType?: string;
  last4?: string;
  bank?: string;
}

export interface IPaymentProvider {
  initiatePayment(userId: string, tripId: string): Promise<PaymentInitializationResponse>;
  verifyTransaction(reference: string): Promise<PaymentVerificationResponse>;
  verifyWebhookSignature(body: string | Buffer, signature: string): boolean;
}
