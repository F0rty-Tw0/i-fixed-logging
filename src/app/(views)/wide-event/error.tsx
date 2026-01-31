'use client';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';

export default function WideEventError({
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
      message='Failed to process enriched wide-event views.'
    />
  );
}
