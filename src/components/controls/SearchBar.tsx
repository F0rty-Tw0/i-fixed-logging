'use client';
import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { logStore } from '../../core/store/log-store';
import styles from './SearchBar.module.css';

// Stable reference for SSR - must be defined outside component
const INITIAL_SEARCH_STATUS = {
  isSearching: false,
  progress: 0,
  query: '',
  matchCount: 0,
  isFiltered: false,
  disabled: false,
} as const;

// Stable function references for useSyncExternalStore
const subscribeToStore = (cb: () => void) => logStore.subscribe(cb);
const getSearchSnapshot = () => logStore.getSearchStatus();
const getServerSearchSnapshot = () => INITIAL_SEARCH_STATUS;

export const SearchBar: React.FC = () => {
  const searchStatus = useSyncExternalStore(
    subscribeToStore,
    getSearchSnapshot,
    getServerSearchSnapshot,
  );

  const [localSearch, setLocalSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      logStore.setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  return (
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
  );
};
