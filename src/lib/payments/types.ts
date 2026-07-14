// Contrato comum a qualquer gateway de pagamento (PicPay, etc.)
// O resto do app nunca importa um provider concreto — só essa interface,
// via getPaymentProvider() em src/lib/payments/index.ts.

export interface PaymentPreferenceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface CreatePreferenceInput {
  orderId: string;
  orderNumber: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerDocument?: string;
  items: PaymentPreferenceItem[];
}

export interface CreatePreferenceResult {
  checkoutUrl: string;
  externalId: string;
  pixCode?: string;
  pixQrBase64?: string;
  externalCheckoutUrl?: string;
}

export type PaymentVerificationStatus = "approved" | "pending" | "rejected" | "cancelled";

export interface PaymentVerificationResult {
  status: PaymentVerificationStatus;
  paidAt?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult>;
  verifyPayment(externalId: string): Promise<PaymentVerificationResult>;
}
