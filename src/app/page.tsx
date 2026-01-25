'use client';

import { useState } from 'react';
import { Controls } from '../components/Controls';
import { Navigation } from '../components/Navigation';
import { useSimulation } from '../core/hooks/useSimulation';
import { ViewMode } from '../core/types/domain';
import { QueueSimulatorView } from '../components/views/QueueSimulatorView';
import { TailSamplingView } from '../components/views/TailSamplingView';
import {
  WideEventView,
  StructuredLogsView,
  DistributedTracingView,
} from '../components/views/Placeholders';

export default function Home() {
  const { start, stop, reset, setUsers, isRunning, stats } = useSimulation();

  const [activeTab, setActiveTab] = useState<ViewMode>(
    ViewMode.QUEUE_SIMULATOR,
  );

  const renderView = () => {
    switch (activeTab) {
      case ViewMode.QUEUE_SIMULATOR:
        return <QueueSimulatorView />;
      case ViewMode.TAIL_SAMPLING:
        return <TailSamplingView />;
      case ViewMode.WIDE_EVENT:
        return <WideEventView />;
      case ViewMode.STRUCTURED_LOGS:
        return <StructuredLogsView />;
      case ViewMode.DISTRIBUTED_TRACING:
        return <DistributedTracingView />;
      default:
        return <QueueSimulatorView />;
    }
  };

  return (
    <main className='layout-container'>
      <Controls
        isRunning={isRunning}
        activeCount={stats.activeCount}
        onStart={start}
        onStop={stop}
        onReset={reset}
        onUsersChange={setUsers}
        navigation={
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        }
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {renderView()}
      </div>
    </main>
  );
}

