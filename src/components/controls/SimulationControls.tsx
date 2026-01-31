'use client';
import React, { useState } from 'react';
import clsx from 'clsx';
import { MAX_USERS } from '../../core/constants';
import styles from './SimulationControls.module.css';

interface SimulationControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUsersChange: (val: number) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isRunning,
  onStart,
  onStop,
  onReset,
  onUsersChange,
}) => {
  const [targetVal, setTargetVal] = useState(1);

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

  return (
    <div className={styles['container']}>
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
    </div>
  );
};
