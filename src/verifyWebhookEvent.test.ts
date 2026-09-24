import { describe, it, expect } from "vitest";
import Stripe from "stripe";
import { verifyWebhookEvent } from "./verifyWebhookEvent";

const secret = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");

function buildPayload() {
  return JSON.stringify({
    id: "evt_test_123",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        object: "checkout.session",
      },
    },
  });
}

describe("verifyWebhookEvent", () => {
  it("returns success: true and the event when the signature matches the secret", () => {
    const payload = buildPayload();
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    const result = verifyWebhookEvent(payload, signature, secret, stripe);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.event.id).toBe("evt_test_123");
      expect(result.event.type).toBe("checkout.session.completed");
    }
  });

  it("returns success: false when verified against the wrong secret", () => {
    const payload = buildPayload();
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    const result = verifyWebhookEvent(payload, signature, "whsec_wrong_secret", stripe);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it("returns success: false when the signature format itself is invalid", () => {
    const payload = buildPayload();

    const result = verifyWebhookEvent(payload, "not-a-valid-signature-header", secret, stripe);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
