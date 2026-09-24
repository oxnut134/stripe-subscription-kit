import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";
import { handleWebhookEvent } from "./handleWebhookEvent";
import type { WebhookHandlers } from "./types";

function makeEvent(type: string, object: Record<string, unknown>): Stripe.Event {
  return {
    id: "evt_test_123",
    object: "event",
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

function makeHandlers(): WebhookHandlers {
  return {
    onSubscriptionActive: vi.fn(),
    onSubscriptionUpdated: vi.fn(),
    onSubscriptionCanceled: vi.fn(),
    onPaymentFailed: vi.fn(),
  };
}

describe("handleWebhookEvent", () => {
  let handlers: WebhookHandlers;

  beforeEach(() => {
    handlers = makeHandlers();
  });

  it("calls onSubscriptionActive with customerId, subscriptionId, and priceId extracted from metadata on checkout.session.completed", async () => {
    const event = makeEvent("checkout.session.completed", {
      id: "cs_test_123",
      object: "checkout.session",
      customer: "cus_123",
      subscription: "sub_123",
      metadata: {
        priceId: "price_123",
        orderId: "order_456",
      },
    });

    const result = await handleWebhookEvent(event, handlers);

    expect(handlers.onSubscriptionActive).toHaveBeenCalledWith({
      customerId: "cus_123",
      subscriptionId: "sub_123",
      priceId: "price_123",
      metadata: { orderId: "order_456" },
    });
    expect(handlers.onSubscriptionUpdated).not.toHaveBeenCalled();
    expect(handlers.onSubscriptionCanceled).not.toHaveBeenCalled();
    expect(handlers.onPaymentFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ handled: true, type: "checkout.session.completed" });
  });

  it("calls onSubscriptionUpdated with customerId, subscriptionId, and priceId on customer.subscription.updated", async () => {
    const event = makeEvent("customer.subscription.updated", {
      id: "sub_123",
      object: "subscription",
      customer: "cus_123",
      metadata: { plan: "pro" },
      items: {
        object: "list",
        data: [{ price: { id: "price_789" } }],
      },
    });

    const result = await handleWebhookEvent(event, handlers);

    expect(handlers.onSubscriptionUpdated).toHaveBeenCalledWith({
      customerId: "cus_123",
      subscriptionId: "sub_123",
      priceId: "price_789",
      metadata: { plan: "pro" },
    });
    expect(result).toEqual({ handled: true, type: "customer.subscription.updated" });
  });

  it("calls onSubscriptionCanceled on customer.subscription.deleted", async () => {
    const event = makeEvent("customer.subscription.deleted", {
      id: "sub_123",
      object: "subscription",
      customer: "cus_123",
    });

    const result = await handleWebhookEvent(event, handlers);

    expect(handlers.onSubscriptionCanceled).toHaveBeenCalledWith({
      customerId: "cus_123",
      subscriptionId: "sub_123",
    });
    expect(result).toEqual({ handled: true, type: "customer.subscription.deleted" });
  });

  it("calls onPaymentFailed and defaults subscriptionId to an empty string when subscription info is absent on invoice.payment_failed", async () => {
    const event = makeEvent("invoice.payment_failed", {
      id: "in_test_123",
      object: "invoice",
      customer: "cus_123",
      parent: null,
    });

    const result = await handleWebhookEvent(event, handlers);

    expect(handlers.onPaymentFailed).toHaveBeenCalledWith({
      customerId: "cus_123",
      subscriptionId: "",
      invoiceId: "in_test_123",
    });
    expect(result).toEqual({ handled: true, type: "invoice.payment_failed" });
  });

  it("calls no handlers and returns handled: false for an unsupported event type", async () => {
    const event = makeEvent("payment_intent.succeeded", {
      id: "pi_test_123",
      object: "payment_intent",
    });

    const result = await handleWebhookEvent(event, handlers);

    expect(handlers.onSubscriptionActive).not.toHaveBeenCalled();
    expect(handlers.onSubscriptionUpdated).not.toHaveBeenCalled();
    expect(handlers.onSubscriptionCanceled).not.toHaveBeenCalled();
    expect(handlers.onPaymentFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ handled: false, type: "payment_intent.succeeded" });
  });
});
