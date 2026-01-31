'use client';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';

export default function TailSamplingError({
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
      message='Tail sampling orchestrator encountered a synchronization error.'
    />
  );
}
