import React from 'react';
import styles from './Loading.module.css';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading signals...',
  fullScreen = false,
}) => {
  return (
    <div
      className={`${styles.container} ${fullScreen ? styles.fullScreen : ''}`}
    >
      <div className={styles.loader}>
        <div className={styles.bar}></div>
        <div className={styles.bar}></div>
        <div className={styles.bar}></div>
        <div className={styles.bar}></div>
      </div>
      <p className={styles.text}>{message}</p>
    </div>
  );
};
