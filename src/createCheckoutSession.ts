// src/createCheckoutSession.ts

import Stripe from "stripe";
import type { CreateCheckoutSessionParams, CreateCheckoutSessionResult } from "./types";

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
  stripe: Stripe
): Promise<CreateCheckoutSessionResult> {
  const session = await stripe.checkout.sessions.create({
    mode: params.mode ?? "subscription",
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    customer: params.customerId,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      ...params.metadata,
      priceId: params.priceId,
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL");
  }

  return { url: session.url };
}