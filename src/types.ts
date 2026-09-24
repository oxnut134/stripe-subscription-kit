// src/types.ts

export type CreateCheckoutSessionParams = {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  mode?: "subscription" | "payment";
};

export type CreateCheckoutSessionResult = {
  url: string;
};

export type CreatePortalSessionParams = {
  customerId: string;
  returnUrl: string;
};

export type CreatePortalSessionResult = {
  url: string;
};

export type SubscriptionActiveData = {
  customerId: string;
  subscriptionId: string;
  priceId: string;
  metadata?: Record<string, string>;
};

export type SubscriptionUpdatedData = {
  customerId: string;
  subscriptionId: string;
  priceId: string;
  metadata?: Record<string, string>;
};

export type SubscriptionCanceledData = {
  customerId: string;
  subscriptionId: string;
};

export type PaymentFailedData = {
  customerId: string;
  subscriptionId: string;
  invoiceId: string;
};

export type WebhookHandlers = {
  onSubscriptionActive: (data: SubscriptionActiveData) => Promise<void> | void;
  onSubscriptionUpdated: (data: SubscriptionUpdatedData) => Promise<void> | void;
  onSubscriptionCanceled: (data: SubscriptionCanceledData) => Promise<void> | void;
  onPaymentFailed: (data: PaymentFailedData) => Promise<void> | void;
};

export type HandleWebhookEventResult = {
  handled: boolean;
  type: string;
};