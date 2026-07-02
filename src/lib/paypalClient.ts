/**
 * Lazily load the PayPal JS SDK (browser) with the public sandbox client id.
 * Returns the `window.paypal` namespace, or rejects if not configured.
 */
let loading: Promise<unknown> | null = null;

export function paypalClientId(): string | undefined {
  return (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) || undefined;
}

export function paypalEnabled(): boolean {
  return Boolean(paypalClientId());
}

export function loadPayPal(currency = 'EUR'): Promise<unknown> {
  const id = paypalClientId();
  if (!id) return Promise.reject(new Error('paypal-not-configured'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.paypal) return Promise.resolve(w.paypal);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(id)}&currency=${encodeURIComponent(currency)}&intent=capture&disable-funding=paylater,credit`;
    s.async = true;
    s.onload = () => resolve(w.paypal);
    s.onerror = () => { loading = null; reject(new Error('paypal-sdk-load-failed')); };
    document.head.appendChild(s);
  });
  return loading;
}
