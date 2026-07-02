/**
 * Minimal PayPal Orders v2 client (server-side). Sandbox by default; set
 * PAYPAL_ENV=live for production. No SDK dependency — just the REST API.
 * Pattern per the `paypal` skill (OAuth2 client-credentials → create → capture).
 */

function base(): string {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error('paypal-not-configured');
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`paypal token ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Create a CAPTURE order for the deposit; returns the PayPal order id. */
export async function createOrder(amount: number, currency: string, ref: string): Promise<string> {
  const token = await accessToken();
  const res = await fetch(`${base()}/v2/checkout/orders`, {
    method: 'POST',
    // Idempotency: PayPal dedupes on this id, so a retried create for the same
    // ref returns the same order instead of minting a duplicate.
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `explora-create-${ref}` },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: ref,
        description: `Explora Journeys reservation deposit · ${ref}`,
        amount: { currency_code: currency, value: amount.toFixed(2) },
      }],
    }),
  });
  const data = (await res.json()) as { id?: string };
  if (!res.ok || !data.id) throw new Error(`paypal create ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data.id;
}

export interface CaptureResult {
  captureId: string;
  status: string;
  amountValue: string | null;
  currencyCode: string | null;
}

/**
 * Capture an approved order. Returns the capture STRICTLY from PayPal's
 * response (`purchase_units[0].payments.captures[0]`) — id, status, amount,
 * currency. Never fabricates a capture: if PayPal doesn't return one, this
 * throws so the caller cannot mark a booking paid on a non-capture.
 */
export async function captureOrder(orderId: string, ref: string): Promise<CaptureResult> {
  const token = await accessToken();
  const res = await fetch(`${base()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    // Idempotency: a retried capture for the same ref is deduped by PayPal.
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `explora-capture-${ref}` },
  });
  const data = (await res.json()) as {
    status?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ id?: string; status?: string; amount?: { value?: string; currency_code?: string } }> };
    }>;
  };
  if (!res.ok) throw new Error(`paypal capture ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  const cap = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!cap?.id || !cap.status) {
    throw new Error(`paypal capture ${orderId}: no capture in response (order status ${data.status ?? 'unknown'})`);
  }
  return {
    captureId: cap.id,
    status: cap.status,
    amountValue: cap.amount?.value ?? null,
    currencyCode: cap.amount?.currency_code ?? null,
  };
}
