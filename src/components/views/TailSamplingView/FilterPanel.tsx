'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  filters: {
    errors: boolean;
    warnings: boolean;
    slow: boolean;
    sampleInfo: boolean;
  };
  toggleFilter: (key: 'errors' | 'warnings' | 'slow' | 'sampleInfo') => void;
  samplingRate: number;
  setSamplingRate: (rate: number) => void;
  setDebouncedSamplingRate: (rate: number) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  toggleFilter,
  samplingRate,
  setSamplingRate,
  setDebouncedSamplingRate,
}) => {
  return (
    <div className={styles.controls}>
      <div className={styles.filterGroup}>
        <label
          className={clsx(
            styles.checkboxLabel,
            filters.errors && styles.checkboxLabelActive,
            filters.errors && styles.checkboxLabelError,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.errors}
            onChange={() => toggleFilter('errors')}
          />
          <span
            className={`${styles.legendSquare} ${styles.legendSquareError}`}
          />
          ERRORS
        </label>

        <label
          className={clsx(
            styles.checkboxLabel,
            filters.warnings && styles.checkboxLabelActive,
            filters.warnings && styles.checkboxLabelWarn,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.warnings}
            onChange={() => toggleFilter('warnings')}
          />
          <span
            className={`${styles.legendSquare} ${styles.legendSquareWarn}`}
          />
          WARNINGS
        </label>

        <label
          className={clsx(
            styles.checkboxLabel,
            filters.slow && styles.checkboxLabelActive,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.slow}
            onChange={() => toggleFilter('slow')}
          />
          <span>🐢</span>
          LATENCY &gt; 1s
        </label>

        <label
          className={clsx(
            styles.checkboxLabel,
            filters.sampleInfo && styles.checkboxLabelActive,
            filters.sampleInfo && styles.checkboxLabelInfo,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.sampleInfo}
            onChange={() => toggleFilter('sampleInfo')}
          />
          <span
            className={`${styles.legendSquare} ${styles.legendSquareInfo}`}
          />
          INFO (5%)
        </label>
      </div>

      <div className={styles.sliderContainer}>
        <label className={styles.sliderLabel}>Sampling: {samplingRate}%</label>
        <input
          type='range'
          min='1'
          max='100'
          value={samplingRate}
          onChange={(e) => setSamplingRate(Number(e.target.value))}
          onMouseUp={() => setDebouncedSamplingRate(samplingRate)}
          onTouchEnd={() => setDebouncedSamplingRate(samplingRate)}
          className={styles.slider}
        />
      </div>
    </div>
  );
};
