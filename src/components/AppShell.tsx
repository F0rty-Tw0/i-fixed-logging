'use client';

import React from 'react';
import { Controls } from './Controls';
import { Navigation } from './Navigation';
import { useSimulationContext } from '../core/context/SimulationContext';
import styles from './AppShell.module.css';

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

      <div className={styles['main-content']}>{children}</div>
    </main>
  );
};
