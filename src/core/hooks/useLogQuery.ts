import { useState, useEffect, useCallback } from 'react';
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

export const useLogQuery = () => {
  const [queryState, setQueryState] = useState<QueryResult>({
    queryId: '',
    results: [],
    columns: [],
    loading: false,
  });

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
    };
  }, []);

  const runQuery = useCallback((sql: string) => {
    const queryId = Math.random().toString(36).substring(7);
    setQueryState({
      queryId,
      results: [],
      columns: [],
      loading: true,
      error: undefined,
    });

    workerManager.postMessage({
      type: 'QUERY',
      payload: { queryId, sql },
    });
  }, []);

  return {
    ...queryState,
    runQuery,
  };
};
