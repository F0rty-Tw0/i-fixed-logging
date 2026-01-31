import { useState, useEffect } from 'react';
import { traceStore } from '../store';
import { TraceSummary } from '../types/domain';

export const useTraceAggregation = () => {
  const [summaries, setSummaries] = useState<TraceSummary[]>(
    traceStore.getSummaries(),
  );

  useEffect(() => {
    // Subscribe to global store updates
    const unsub = traceStore.subscribe((newSummaries) => {
      setSummaries(newSummaries);
    });

    return () => {
      unsub();
    };
  }, []);

  return summaries;
};
