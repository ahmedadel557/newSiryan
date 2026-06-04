'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = getPages(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        className="btn btn-ghost btn-icon"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 text-center text-[13px] text-[var(--fg-3)]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="btn btn-ghost btn-icon text-[13px] font-medium"
            style={
              p === page
                ? { background: 'var(--brand)', color: '#fff' }
                : undefined
            }
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        className="btn btn-ghost btn-icon"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
