export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current motion-reduce:animate-none ${className}`}
      aria-hidden
    />
  );
}
