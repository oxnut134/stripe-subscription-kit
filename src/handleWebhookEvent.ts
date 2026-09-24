// src/handleWebhookEvent.ts

import Stripe from "stripe";
import type {
  WebhookHandlers,
  HandleWebhookEventResult,
  SubscriptionActiveData,
  SubscriptionUpdatedData,
  SubscriptionCanceledData,
  PaymentFailedData,
} from "./types";

export async function handleWebhookEvent(
  event: Stripe.Event,
  handlers: WebhookHandlers
): Promise<HandleWebhookEventResult> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata ?? {};
      const { priceId, ...restMetadata } = metadata;

      const data: SubscriptionActiveData = {
        customerId: session.customer as string,
        subscriptionId: session.subscription as string,
        priceId: priceId ?? "",
        metadata: restMetadata,
      };
      await handlers.onSubscriptionActive(data);
      return { handled: true, type: event.type };
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const data: SubscriptionUpdatedData = {
        customerId: subscription.customer as string,
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id ?? "",
        metadata: subscription.metadata ?? undefined,
      };
      await handlers.onSubscriptionUpdated(data);
      return { handled: true, type: event.type };
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const data: SubscriptionCanceledData = {
        customerId: subscription.customer as string,
        subscriptionId: subscription.id,
      };
      await handlers.onSubscriptionCanceled(data);
      return { handled: true, type: event.type };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionDetails = invoice.parent?.subscription_details;
      const subscription = subscriptionDetails?.subscription;
      const data: PaymentFailedData = {
        customerId: invoice.customer as string,
        subscriptionId:
          typeof subscription === "string" ? subscription : subscription?.id ?? "",
        invoiceId: invoice.id,
      };
      await handlers.onPaymentFailed(data);
      return { handled: true, type: event.type };
    }

    default:
      return { handled: false, type: event.type };
  }
}