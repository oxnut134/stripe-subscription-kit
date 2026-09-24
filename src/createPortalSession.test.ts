import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";
import { createPortalSession } from "./createPortalSession";

describe("createPortalSession", () => {
  it("calls stripe.billingPortal.sessions.create with customer and return_url, and returns the url", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session_123" });
    const stripe = {
      billingPortal: {
        sessions: {
          create,
        },
      },
    } as unknown as Stripe;

    const result = await createPortalSession(
      {
        customerId: "cus_123",
        returnUrl: "https://example.com/account",
      },
      stripe
    );

    expect(create).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://example.com/account",
    });
    expect(result).toEqual({ url: "https://billing.stripe.com/session_123" });
  });
});
