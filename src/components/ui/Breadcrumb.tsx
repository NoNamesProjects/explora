import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  variant?: 'dark' | 'light';
  className?: string;
}

export function Breadcrumb({ items, variant = 'dark', className = '' }: BreadcrumbProps) {
  const color = variant === 'light' ? 'text-cream/80' : 'text-ink-600';
  return (
    <nav aria-label="Breadcrumb" className={`text-xs uppercase tracking-[0.12em] ${color} ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-3">
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:opacity-70 transition-opacity">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'opacity-70' : ''}>{item.label}</span>
              )}
              {!isLast && (
                <span aria-hidden className="opacity-40 select-none">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
