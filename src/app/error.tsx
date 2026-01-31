'use client';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';

export default function GlobalError({
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
      message='The core signal pipeline encountered a fatal error.'
    />
  );
}
