'use client';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';

export default function LogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      message='Structured log query engine failed to respond.'
    />
  );
}
