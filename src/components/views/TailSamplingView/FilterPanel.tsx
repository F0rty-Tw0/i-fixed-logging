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
            styles.checkboxLabelError,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.errors}
            onChange={() => toggleFilter('errors')}
          />
          <span className={clsx(styles.indicator, styles.indicatorError)} />
          ERRORS
        </label>

        <label
          className={clsx(
            styles.checkboxLabel,
            filters.warnings && styles.checkboxLabelActive,
            styles.checkboxLabelWarn,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.warnings}
            onChange={() => toggleFilter('warnings')}
          />
          <span className={clsx(styles.indicator, styles.indicatorWarn)} />
          WARNINGS
        </label>

        <label
          className={clsx(
            styles.checkboxLabel,
            filters.slow && styles.checkboxLabelActive,
            styles.checkboxLabelSlow,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.slow}
            onChange={() => toggleFilter('slow')}
          />
          <span className={clsx(styles.indicator, styles.indicatorSlow)} />
          LATENCY &gt; 1S
        </label>

        <label
          className={clsx(
            styles.checkboxLabel,
            filters.sampleInfo && styles.checkboxLabelActive,
            styles.checkboxLabelInfo,
          )}
        >
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.sampleInfo}
            onChange={() => toggleFilter('sampleInfo')}
          />
          <span className={clsx(styles.indicator, styles.indicatorInfo)} />
          INFO (5%)
        </label>
      </div>

      <div className={styles.sliderContainer}>
        <div className={styles.sliderHeader}>
          <span className={styles.sliderLabel}>Sampling Density</span>
          <span className={styles.sliderValue}>{samplingRate}%</span>
        </div>
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
