import { useState, useEffect, useCallback, useRef } from 'react';
import { workerManager } from '../worker/worker-manager';

export interface QueryResult {
  queryId: string;
  results: Record<string, unknown>[];
  columns: string[];
  error?: string;
  loading: boolean;
}

interface QueryResultsPayload {
  queryId: string;
  results: Record<string, unknown>[];
  columns: string[];
}

interface QueryErrorPayload {
  queryId: string;
  error: string;
}

export const useLogQuery = (debounceMs = 0) => {
  const [queryState, setQueryState] = useState<QueryResult>({
    queryId: '',
    results: [],
    columns: [],
    loading: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubResults = workerManager.subscribe<QueryResultsPayload>(
      'QUERY_RESULTS',
      (payload) => {
        setQueryState((prev) => {
          if (prev.queryId === payload.queryId) {
            return {
              ...prev,
              results: payload.results,
              columns: payload.columns,
              loading: false,
              error: undefined,
            };
          }
          return prev;
        });
      },
    );

    const unsubError = workerManager.subscribe<QueryErrorPayload>(
      'QUERY_ERROR',
      (payload) => {
        setQueryState((prev) => {
          if (prev.queryId === payload.queryId) {
            return {
              ...prev,
              loading: false,
              error: payload.error,
            };
          }
          return prev;
        });
      },
    );

    return () => {
      unsubResults();
      unsubError();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const runQuery = useCallback(
    (sql: string, immediate = false) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const execute = () => {
        const queryId = Math.random().toString(36).substring(7);
        setQueryState((prev) => ({
          ...prev,
          queryId,
          loading: true,
          error: undefined,
        }));

        workerManager.postMessage({
          type: 'QUERY',
          payload: { queryId, sql },
        });
      };

      if (immediate || debounceMs === 0) {
        execute();
      } else {
        debounceTimerRef.current = setTimeout(execute, debounceMs);
      }
    },
    [debounceMs],
  );

  return {
    ...queryState,
    runQuery,
  };
};
