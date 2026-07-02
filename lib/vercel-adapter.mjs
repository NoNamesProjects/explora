// Adapts Vercel serverless function handlers (default-exported async
// (req, res) => {}) into Express middleware. Vercel handlers get
// dynamic route params on req.query; Express puts them on req.params.
// We copy params into query so the same handler runs under both
// runtimes without modification.
//
// Used by server.js when running on cPanel Passenger / any Node host.
//
// Pattern lifted verbatim from Pame_Costa/lib/vercel-adapter.mjs.

export function adapt(vercelHandler) {
  return async (req, res, next) => {
    try {
      if (req.params && Object.keys(req.params).length) {
        // Express 5 makes `req.query` a getter-only property, so a plain
        // assignment throws. Shadow the inherited getter with an own data
        // property carrying the merged params, so handlers that read
        // req.query.<param> still work (handlers that parse req.url keep
        // working regardless).
        const merged = { ...(req.query || {}), ...req.params };
        try {
          Object.defineProperty(req, 'query', {
            value: merged,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        } catch {
          try { Object.assign(req.query, req.params); } catch { /* handler can still parse req.url */ }
        }
      }
      await vercelHandler(req, res);
    } catch (err) {
      // Pass to Express's error handler so we don't end up with hung
      // requests. Functions are expected to send a response themselves;
      // this is a safety net for unhandled throws.
      next(err);
    }
  };
}
