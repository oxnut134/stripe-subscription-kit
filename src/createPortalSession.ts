// src/createPortalSession.ts

import Stripe from "stripe";
import type { CreatePortalSessionParams, CreatePortalSessionResult } from "./types";

export async function createPortalSession(
  params: CreatePortalSessionParams,
  stripe: Stripe
): Promise<CreatePortalSessionResult> {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return { url: session.url };
}