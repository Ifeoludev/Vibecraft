import { useEffect } from 'react';

export function usePageTitle(page: string) {
  useEffect(() => {
    document.title = `Vibecraft - ${page}`;
    return () => { document.title = 'Vibecraft'; };
  }, [page]);
}
