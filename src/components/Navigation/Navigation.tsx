'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

import { ViewMode } from '../../core/types/domain';
import styles from './Navigation.module.css';

const TABS = [
  {
    id: ViewMode.QUEUE_SIMULATOR,
    label: 'Simulator',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <polyline points='22 12 18 12 15 21 9 3 6 12 2 12'></polyline>
      </svg>
    ),
  },
  {
    id: ViewMode.DISTRIBUTED_TRACING,
    label: 'Traces',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M6 3v12'></path>
        <circle cx='18' cy='6' r='3'></circle>
        <circle cx='6' cy='18' r='3'></circle>
        <path d='M18 9a9 9 0 0 1-9 9'></path>
      </svg>
    ),
  },
  {
    id: ViewMode.STRUCTURED_LOGS,
    label: 'Logs',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <line x1='4' y1='9' x2='20' y2='9'></line>
        <line x1='4' y1='15' x2='20' y2='15'></line>
        <line x1='10' y1='3' x2='8' y2='21'></line>
        <line x1='16' y1='3' x2='14' y2='21'></line>
      </svg>
    ),
  },
  {
    id: ViewMode.WIDE_EVENT,
    label: 'Journeys',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'></path>
        <path d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'></path>
      </svg>
    ),
  },
  {
    id: ViewMode.TAIL_SAMPLING,
    label: 'Traffic',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <rect x='3' y='3' width='7' height='7'></rect>
        <rect x='14' y='3' width='7' height='7'></rect>
        <rect x='14' y='14' width='7' height='7'></rect>
        <rect x='3' y='14' width='7' height='7'></rect>
      </svg>
    ),
  },
];

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const isActive = (tabId: string) => {
    if (tabId === ViewMode.QUEUE_SIMULATOR && pathname === '/') return true;
    return pathname === `/${tabId}`;
  };

  return (
    <nav
      className={clsx(styles.rail, isExpanded && styles['rail-expanded'])}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={styles['rail-inner']}>
        <div className={styles.logo}>
          <div className={styles['logo-inner']} />
        </div>

        <div className={styles['nav-list']}>
          {TABS.map((tab, index) => {
            const active = isActive(tab.id);
            const href =
              tab.id === ViewMode.QUEUE_SIMULATOR ? '/' : `/${tab.id}`;

            return (
              <Link
                key={tab.id}
                href={href}
                className={clsx(
                  styles['nav-item'],
                  active && styles['nav-item-active'],
                  isExpanded && styles['nav-item-expanded'],
                )}
                style={{ '--index': index } as React.CSSProperties}
              >
                <span className={styles.icon}>{tab.icon}</span>
                <span className={styles.label}>{tab.label}</span>
                {!isExpanded && (
                  <span className={styles.tooltip}>{tab.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
