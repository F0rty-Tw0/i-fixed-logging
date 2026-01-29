'use client';

import { TraceList } from '@/components/views/DistributedTracingView/TraceList';
import { WaterfallChart } from '@/components/views/DistributedTracingView/WaterfallChart';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function TracingContent() {
  const searchParams = useSearchParams();
  const router = useRouter(); // We need to import this

  const traceIdParam = searchParams.get('traceId');
  const selectedTraceId = traceIdParam ? parseInt(traceIdParam) : null;

  const handleSelectTrace = (id: number) => {
    router.push(`/distributed-tracing?traceId=${id}`);
  };

  const clearSelection = () => {
    router.push('/distributed-tracing');
  };

  if (selectedTraceId !== null) {
    return <WaterfallChart traceId={selectedTraceId} onBack={clearSelection} />;
  }

  return <TraceList onSelectTrace={handleSelectTrace} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ color: '#fff' }}>Loading...</div>}>
      <TracingContent />
    </Suspense>
  );
}
