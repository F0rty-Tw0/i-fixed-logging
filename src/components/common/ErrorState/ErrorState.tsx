'use client';

import React from 'react';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  message?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  reset,
  message = 'A critical error occurred while processing signals.',
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>⚠️</div>
        <h2 className={styles.title}>Signal Interrupted</h2>
        <p className={styles.message}>{message}</p>
        {error.digest && (
          <code className={styles.digest}>ID: {error.digest}</code>
        )}
        <div className={styles.actions}>
          <button className={styles.resetButton} onClick={reset}>
            Reconnect
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => window.location.reload()}
          >
            Hard Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
