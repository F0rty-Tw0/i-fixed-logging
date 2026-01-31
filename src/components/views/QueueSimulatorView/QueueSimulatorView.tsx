'use client';

import React from 'react';
import { VirtualLogList } from '../../VirtualLogList';

import styles from './QueueSimulatorView.module.css';

export const QueueSimulatorView: React.FC = () => {
  return (
    <div className={styles['view-content']}>
      <VirtualLogList />
    </div>
  );
};
