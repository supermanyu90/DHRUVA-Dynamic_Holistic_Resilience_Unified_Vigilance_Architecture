import { useCallback, useEffect, useState } from 'react';
import { Watchlist, EMPTY_WATCHLIST, loadWatchlist, saveWatchlist, isWatchlistEmpty } from './watchlist';

export type { Watchlist };

/** React state wrapper around the localStorage-backed watchlist. */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Watchlist>(EMPTY_WATCHLIST);

  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const commit = useCallback((next: Watchlist) => {
    setWatchlist(next);
    saveWatchlist(next);
  }, []);

  const addRegion = useCallback((region: string) => {
    const val = region.trim();
    if (!val) return;
    setWatchlist(prev => {
      if (prev.regions.some(r => r.toLowerCase() === val.toLowerCase())) return prev;
      const next = { ...prev, regions: [...prev.regions, val] };
      saveWatchlist(next);
      return next;
    });
  }, []);

  const removeRegion = useCallback((region: string) => {
    setWatchlist(prev => {
      const next = { ...prev, regions: prev.regions.filter(r => r !== region) };
      saveWatchlist(next);
      return next;
    });
  }, []);

  const addKeyword = useCallback((keyword: string) => {
    const val = keyword.trim();
    if (!val) return;
    setWatchlist(prev => {
      if (prev.keywords.some(k => k.toLowerCase() === val.toLowerCase())) return prev;
      const next = { ...prev, keywords: [...prev.keywords, val] };
      saveWatchlist(next);
      return next;
    });
  }, []);

  const removeKeyword = useCallback((keyword: string) => {
    setWatchlist(prev => {
      const next = { ...prev, keywords: prev.keywords.filter(k => k !== keyword) };
      saveWatchlist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => commit(EMPTY_WATCHLIST), [commit]);

  return {
    watchlist,
    isEmpty: isWatchlistEmpty(watchlist),
    addRegion,
    removeRegion,
    addKeyword,
    removeKeyword,
    clear,
  };
}
