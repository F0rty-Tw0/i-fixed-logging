'use client';

import { TraceList } from './TraceList';
import { WaterfallChart } from './WaterfallChart';
import { useSearchParams, useRouter } from 'next/navigation';

export function DistributedTracingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const traceIdParam = searchParams.get('traceId');
  const selectedTraceId = traceIdParam ? parseInt(traceIdParam) : null;

  const handleSelectTrace = (id: number) => {
    router.push(`/distributed-tracing?traceId=${id}`);
  };

  const clearSelection = () => {
    router.back();
  };

  if (selectedTraceId !== null) {
    return <WaterfallChart traceId={selectedTraceId} onBack={clearSelection} />;
  }

  return <TraceList onSelectTrace={handleSelectTrace} />;
}
