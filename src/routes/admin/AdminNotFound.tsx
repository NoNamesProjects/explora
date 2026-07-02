import { Link } from 'react-router-dom';

export function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="font-serif text-4xl text-ink">404</p>
      <p className="text-sm text-ink-500">That admin page doesn’t exist.</p>
      <Link to="/admin" className="btn-secondary mt-2">Back to overview</Link>
    </div>
  );
}
