export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
};

export type PaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  provider: 'paystack' | 'flutterwave';
  status: 'pending' | 'completed' | 'failed';
};
