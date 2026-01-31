'use client';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';

export default function TracingError({
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
      message='Failed to reconstruct the distributed trace waterfall.'
    />
  );
}
