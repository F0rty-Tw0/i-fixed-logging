'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import styles from './Controls.module.css';
import { ViewMode } from '../../core/types/domain';

const PAGE_TITLES: Record<string, string> = {
  '/': 'QUEUE SIMULATOR',
  [`/${ViewMode.TAIL_SAMPLING}`]: 'TAIL SAMPLING',
  [`/${ViewMode.WIDE_EVENT}`]: 'WIDE EVENTS',
  [`/${ViewMode.STRUCTURED_LOGS}`]: 'STRUCTURED LOGS',
  [`/${ViewMode.DISTRIBUTED_TRACING}`]: 'DISTRIBUTED TRACING',
};

export const PageHeader: React.FC = () => {
  const pathname = usePathname();
  const currentTitle = PAGE_TITLES[pathname] || 'QUEUE SIMULATOR';

  return <span className={styles['title']}>{currentTitle}</span>;
};
