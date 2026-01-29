'use client';

import React from 'react';
import { Controls } from './Controls';
import { Navigation } from './Navigation';
import { useSimulationContext } from '../core/context/SimulationContext';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { start, stop, reset, setUsers, isRunning, stats } =
    useSimulationContext();

  return (
    <main className='layout-container'>
      <Controls
        isRunning={isRunning}
        activeCount={stats.activeCount}
        onStart={start}
        onStop={stop}
        onReset={reset}
        onUsersChange={setUsers}
        navigation={<Navigation />}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </main>
  );
};
