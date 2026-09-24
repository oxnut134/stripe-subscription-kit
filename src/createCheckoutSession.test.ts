import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";
import { createCheckoutSession } from "./createCheckoutSession";

function makeStripe(createResult: { url: string | null }) {
  const create = vi.fn().mockResolvedValue(createResult);
  const stripe = {
    checkout: {
      sessions: {
        create,
      },
    },
  } as unknown as Stripe;
  return { stripe, create };
}

describe("createCheckoutSession", () => {
  it("calls stripe.checkout.sessions.create with line_items, mode, urls, and priceId in metadata, and returns the url", async () => {
    const { stripe, create } = makeStripe({ url: "https://checkout.stripe.com/session_123" });

    const result = await createCheckoutSession(
      {
        priceId: "price_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      },
      stripe
    );

    expect(create).toHaveBeenCalledWith({
      mode: "subscription",
      line_items: [{ price: "price_123", quantity: 1 }],
      customer: undefined,
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      metadata: { priceId: "price_123" },
    });
    expect(result).toEqual({ url: "https://checkout.stripe.com/session_123" });
  });

  it("passes customerId and metadata through to create(), keeping priceId in metadata", async () => {
    const { stripe, create } = makeStripe({ url: "https://checkout.stripe.com/session_456" });

    await createCheckoutSession(
      {
        priceId: "price_123",
        customerId: "cus_789",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        metadata: { orderId: "order_456" },
      },
      stripe
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_789",
        metadata: { orderId: "order_456", priceId: "price_123" },
      })
    );
  });

  it("defaults mode to 'subscription' when omitted", async () => {
    const { stripe, create } = makeStripe({ url: "https://checkout.stripe.com/session_789" });

    await createCheckoutSession(
      {
        priceId: "price_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      },
      stripe
    );

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mode: "subscription" }));
  });

  it("throws an error when Stripe returns url: null", async () => {
    const { stripe } = makeStripe({ url: null });

    await expect(
      createCheckoutSession(
        {
          priceId: "price_123",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        },
        stripe
      )
    ).rejects.toThrow("Stripe did not return a checkout session URL");
  });
});
