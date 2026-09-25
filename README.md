# stripe-subscription-kit

[日本語版はこちら (README.ja.md)](./README.ja.md)

Framework-agnostic Stripe subscription toolkit for Checkout, webhook verification, and the Billing Portal.

## Installation

```bash
npm install stripe-subscription-kit
```

> **Coming soon to npm.** This package hasn't been published yet. While developing locally, reference it via a `file:` path in the consuming project's `package.json`:
>
> ```json
> {
>   "dependencies": {
>     "stripe-subscription-kit": "file:../stripe-subscription-kit"
>   }
> }
> ```

## Features

- **Framework-agnostic** — works with Next.js, Express, or any other Node.js framework.
- **Result-based webhook verification** — `verifyWebhookEvent` returns a `{ success, ... }` result object instead of throwing, so you can handle invalid signatures without try/catch.
- **Event dispatch handled for you** — `handleWebhookEvent` switches on the Stripe event type and calls the matching callback, so callers just implement `WebhookHandlers` instead of writing a `switch` statement.
- **Delegates plan changes and cancellation to the Stripe Customer Portal** — no need to build your own billing UI; `createPortalSession` hands the customer off to Stripe-hosted self-service.

## Quick Start

### 1. Create a Checkout Session

```ts
import Stripe from "stripe";
import { createCheckoutSession } from "stripe-subscription-kit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const { url } = await createCheckoutSession(
  {
    priceId: "price_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    customerId: "cus_123", // optional
    metadata: { orderId: "order_456" }, // optional
  },
  stripe
);

// Redirect the customer to `url` to complete checkout.
```

### 2. Handle webhooks (Next.js App Router Route Handler)

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";
import { verifyWebhookEvent, handleWebhookEvent } from "stripe-subscription-kit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  const verified = verifyWebhookEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
    stripe
  );

  if (!verified.success) {
    return new Response(verified.error, { status: 400 });
  }

  await handleWebhookEvent(verified.event, {
    onSubscriptionActive: async (data) => {
      // data.customerId, data.subscriptionId, data.priceId, data.metadata
    },
    onSubscriptionUpdated: async (data) => {
      // data.customerId, data.subscriptionId, data.priceId, data.metadata
    },
    onSubscriptionCanceled: async (data) => {
      // data.customerId, data.subscriptionId
    },
    onPaymentFailed: async (data) => {
      // data.customerId, data.subscriptionId, data.invoiceId
    },
  });

  return new Response(null, { status: 200 });
}
```

### 3. Create a Billing Portal Session

```ts
import Stripe from "stripe";
import { createPortalSession } from "stripe-subscription-kit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const { url } = await createPortalSession(
  {
    customerId: "cus_123",
    returnUrl: "https://example.com/account",
  },
  stripe
);

// Redirect the customer to `url` to manage their subscription.
```

## API Reference

### `createCheckoutSession(params, stripe)`

Creates a Stripe Checkout Session for a subscription (or one-time payment).

**Parameters** (`CreateCheckoutSessionParams`):

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `priceId` | `string` | Yes | Stripe Price ID to check out. Also copied into `metadata.priceId`. |
| `successUrl` | `string` | Yes | URL to redirect to after a successful checkout. |
| `cancelUrl` | `string` | Yes | URL to redirect to if the customer cancels. |
| `customerId` | `string` | No | Existing Stripe Customer ID to attach to the session. |
| `metadata` | `Record<string, string>` | No | Extra metadata merged onto the session (`priceId` is always included). |
| `mode` | `"subscription" \| "payment"` | No | Defaults to `"subscription"`. |

**Returns** (`CreateCheckoutSessionResult`): `{ url: string }` — the Checkout Session URL to redirect the customer to.

Throws if Stripe does not return a session URL.

### `createPortalSession(params, stripe)`

Creates a Stripe Billing Portal Session so the customer can manage their subscription.

**Parameters** (`CreatePortalSessionParams`):

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `customerId` | `string` | Yes | Stripe Customer ID. |
| `returnUrl` | `string` | Yes | URL to return to after the customer leaves the portal. |

**Returns** (`CreatePortalSessionResult`): `{ url: string }` — the Billing Portal Session URL.

### `verifyWebhookEvent(payload, signature, secret, stripe)`

Verifies a Stripe webhook signature and parses the event.

**Parameters**:

| Parameter | Type | Description |
| --- | --- | --- |
| `payload` | `string` | Raw request body (must be unparsed). |
| `signature` | `string` | Value of the `Stripe-Signature` header. |
| `secret` | `string` | Webhook signing secret (`whsec_...`). |
| `stripe` | `Stripe` | A Stripe SDK instance. |

**Returns** (`VerifyWebhookEventResult`):

- `{ success: true, event: Stripe.Event }` if the signature is valid.
- `{ success: false, error: string }` if verification fails (wrong secret, malformed signature, etc.).

### `handleWebhookEvent(event, handlers)`

Dispatches a verified Stripe event to the matching callback in `handlers`.

**Parameters**:

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `Stripe.Event` | A verified event, typically the `event` from `verifyWebhookEvent`. |
| `handlers` | `WebhookHandlers` | Callbacks for each subscription lifecycle event (see below). |

`WebhookHandlers`:

| Callback | Called on | Payload |
| --- | --- | --- |
| `onSubscriptionActive` | `checkout.session.completed` | `SubscriptionActiveData`: `{ customerId, subscriptionId, priceId, metadata? }` |
| `onSubscriptionUpdated` | `customer.subscription.updated` | `SubscriptionUpdatedData`: `{ customerId, subscriptionId, priceId, metadata? }` |
| `onSubscriptionCanceled` | `customer.subscription.deleted` | `SubscriptionCanceledData`: `{ customerId, subscriptionId }` |
| `onPaymentFailed` | `invoice.payment_failed` | `PaymentFailedData`: `{ customerId, subscriptionId, invoiceId }` (`subscriptionId` is `""` if the invoice has no associated subscription) |

**Returns** (`HandleWebhookEventResult`): `{ handled: boolean; type: string }` — `handled` is `false` for event types not listed above (no callback is called).

## Design Philosophy

`verifyWebhookEvent` and `handleWebhookEvent` intentionally use different styles. Verification is a single yes/no judgment — "is this signature valid?" — so a plain function that returns a `{ success, ... }` result fits best: no exceptions to catch, no callback needed for a single outcome. Dispatching an event, on the other hand, branches across several event types, each with different data shapes — that's a better fit for a callback map (`WebhookHandlers`), since it lets each event type stay independently testable and the caller only implements the handlers it cares about.

## License

MIT
