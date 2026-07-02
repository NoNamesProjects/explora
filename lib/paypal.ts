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
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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

/** Capture an approved order; returns the capture id + status. */
export async function captureOrder(orderId: string): Promise<{ captureId: string; status: string }> {
  const token = await accessToken();
  const res = await fetch(`${base()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = (await res.json()) as {
    status?: string;
    purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string }> } }>;
  };
  if (!res.ok) throw new Error(`paypal capture ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  const cap = data.purchase_units?.[0]?.payments?.captures?.[0];
  return { captureId: cap?.id ?? orderId, status: cap?.status ?? data.status ?? 'COMPLETED' };
}
