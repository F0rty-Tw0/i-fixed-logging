'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { logStore } from '../core/store/log-store';
import styles from './Controls.module.css';
import clsx from 'clsx';
import { MAX_USERS, ViewMode } from '../core/types/domain';

interface ControlsProps {
  isRunning: boolean;
  activeCount: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUsersChange: (val: number) => void;
  navigation?: React.ReactNode;
}

const INITIAL_SEARCH_STATUS = {
  isSearching: false,
  progress: 0,
  query: '',
  matchCount: 0,
  isFiltered: false,
  disabled: false,
};

const PAGE_TITLES: Record<string, string> = {
  '/': 'QUEUE SIMULATOR',
  [`/${ViewMode.TAIL_SAMPLING}`]: 'TAIL SAMPLING',
  [`/${ViewMode.WIDE_EVENT}`]: 'WIDE EVENTS',
  [`/${ViewMode.STRUCTURED_LOGS}`]: 'STRUCTURED LOGS',
  [`/${ViewMode.DISTRIBUTED_TRACING}`]: 'DISTRIBUTED TRACING',
};

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  activeCount,
  onStart,
  onStop,
  onReset,
  onUsersChange,
  navigation,
}) => {
  const [targetVal, setTargetVal] = useState(1);
  const pathname = usePathname();

  const totalLogs = useSyncExternalStore(
    (cb) => logStore.subscribe(cb),
    () => logStore.getTotalIngested(),
    () => 0,
  );

  const searchStatus = useSyncExternalStore(
    (cb) => logStore.subscribe(cb),
    () => logStore.getSearchStatus(),
    () => INITIAL_SEARCH_STATUS,
  );

  const [localSearch, setLocalSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      logStore.setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Sync simulation state to LogStore for search inhibition
  useEffect(() => {
    logStore.setSimulationRunning(isRunning);
  }, [isRunning]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setTargetVal(val);
    onUsersChange(val);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    const clamped = Math.min(Math.max(0, val), MAX_USERS);
    setTargetVal(clamped);
    onUsersChange(clamped);
  };

  const currentTitle = PAGE_TITLES[pathname] || 'QUEUE SIMULATOR';

  return (
    <div className={styles['controls-container']}>
      <div className={styles['left-panel']}>
        {navigation}
        <span className={styles['title']}>{currentTitle}</span>

        <button
          className={clsx(
            styles['button'],
            isRunning ? styles['danger'] : styles['primary'],
          )}
          disabled={!targetVal}
          onClick={isRunning ? onStop : onStart}
        >
          {isRunning ? 'STOP' : 'START'}
        </button>

        <button
          className={clsx(styles['button'], styles['secondary'])}
          onClick={onReset}
          disabled={isRunning}
          style={{ marginLeft: '10px' }}
        >
          RESET
        </button>

        <div className={styles['slider-group']}>
          <div className={styles['users-header']}>
            <label>USERS:</label>
            <input
              type='number'
              min='1'
              max={MAX_USERS}
              value={targetVal}
              onChange={handleInputChange}
              className={styles['number-input']}
            />
          </div>
          <input
            type='range'
            min='1'
            max={MAX_USERS}
            value={targetVal}
            onChange={handleSliderChange}
          />
        </div>

        <div className={styles['search-group']}>
          <div className={styles['search-input-wrapper']}>
            <input
              type='text'
              placeholder='Search logs...'
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className={styles['search-input']}
              title='Search logs'
            />
            {localSearch && (
              <button
                className={styles['clear-button']}
                onClick={() => setLocalSearch('')}
                aria-label='Clear search'
              >
                ×
              </button>
            )}
            {searchStatus.isSearching && (
              <div className={styles['progress-bar']}>
                <div
                  className={styles['progress-fill']}
                  style={{ width: `${searchStatus.progress}%` }}
                />
              </div>
            )}
          </div>
          {searchStatus.isFiltered && (
            <span className={styles['match-count']}>
              {searchStatus.isSearching
                ? 'SEARCHING...'
                : `MATCHED: ${searchStatus.matchCount.toLocaleString()}`}
            </span>
          )}
        </div>
      </div>

      <div className={styles['right-panel']}>
        <div className={styles['hud-stat']}>
          <span className={styles['label']}>Active Journeys</span>
          <span className={styles['value']}>
            {activeCount.toLocaleString()}
          </span>
        </div>
        <div className={styles['hud-stat']}>
          <span className={styles['label']}>Total Logs</span>
          <span className={styles['value']}>{totalLogs.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
