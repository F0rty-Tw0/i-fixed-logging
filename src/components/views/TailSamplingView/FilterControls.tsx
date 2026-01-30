import React from 'react';
import styles from '../TailSamplingView.module.css';

interface FilterControlsProps {
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

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  toggleFilter,
  samplingRate,
  setSamplingRate,
  setDebouncedSamplingRate,
}) => {
  return (
    <div className={styles.controls}>
      <div className={styles.filterGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.errors}
            onChange={() => toggleFilter('errors')}
          />
          <span
            className={`${styles.legendSquare} ${styles.legendSquareError}`}
          />
          Errors
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.warnings}
            onChange={() => toggleFilter('warnings')}
          />
          <span
            className={`${styles.legendSquare} ${styles.legendSquareWarn}`}
          />
          Warnings
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.slow}
            onChange={() => toggleFilter('slow')}
          />
          Slow (&gt;1s)
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.sampleInfo}
            onChange={() => toggleFilter('sampleInfo')}
          />
          <span
            className={`${styles.legendSquare} ${styles.legendSquareInfo}`}
          />
          Sample Info (5%)
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
