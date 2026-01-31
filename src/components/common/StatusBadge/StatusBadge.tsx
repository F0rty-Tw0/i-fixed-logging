'use client';

import React from 'react';
import { EVENT_NAMES, JourneyEvent } from '../../../core/types/domain';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  event: JourneyEvent;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ event }) => {
  const name = EVENT_NAMES[event];
  const colorClass = `status_${name.toUpperCase()}`;

  return (
    <span className={`${styles.badge} ${styles[colorClass] || ''}`}>
      {name}
    </span>
  );
};
