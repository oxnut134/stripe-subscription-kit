// src/verifyWebhookEvent.ts

import Stripe from "stripe";

export type VerifyWebhookEventResult =
  | { success: true; event: Stripe.Event }
  | { success: false; error: string };

export function verifyWebhookEvent(
  payload: string,
  signature: string,
  secret: string,
  stripe: Stripe
): VerifyWebhookEventResult {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return { success: true, event };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during webhook verification";
    return { success: false, error: message };
  }
}