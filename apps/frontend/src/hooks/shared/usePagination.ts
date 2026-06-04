import { useCallback, useState } from 'react';

export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);

  const goToPage = useCallback((p: number) => setPage(p), []);
  const reset = useCallback(() => setPage(1), []);

  return { page, limit, goToPage, reset };
}
