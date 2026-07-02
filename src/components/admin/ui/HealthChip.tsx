export function HealthChip({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-cream-300 bg-cream-soft px-4 py-3">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok ? 'bg-accent-patina' : 'bg-red-500'}`}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-xs text-ink-500">{ok ? (detail ?? 'Configured') : (detail ?? 'Not configured')}</div>
      </div>
    </div>
  );
}
