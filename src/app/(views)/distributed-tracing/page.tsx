import { DistributedTracingPageClient } from '@/components/views/DistributedTracingView/DistributedTracingPageClient';
import { Suspense } from 'react';

export const metadata = {
  title: 'Distributed Tracing | I FIXED LOGGING',
  description: 'Analyze distributed traces and waterfalls',
};

export default function DistributedTracingPage() {
  return (
    <Suspense fallback={null}>
      <DistributedTracingPageClient />
    </Suspense>
  );
}
