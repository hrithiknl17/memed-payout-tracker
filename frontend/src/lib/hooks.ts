'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

/** Runs an async loader on mount, with an error message and a reload function. */
export function useLoad<T>(load: () => Promise<T>) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, reload };
}

/** Everything the creator screens share: live and ended campaigns, own submissions and earnings. */
export function useCreatorData() {
  return useLoad(async () => {
    const [live, ended, mine] = await Promise.all([api.liveCampaigns(), api.endedCampaigns(), api.mySubmissions()]);
    return { live: live.campaigns, ended: ended.campaigns, submissions: mine.submissions, earnings: mine.earnings };
  });
}
