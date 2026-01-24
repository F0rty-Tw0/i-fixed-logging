'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ViewMode } from '../core/types/domain';
import styles from './Navigation.module.css';

interface NavigationProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
}

const TABS = [
  { id: ViewMode.QUEUE_SIMULATOR, label: 'Queue Simulator', icon: '🚦' },
  { id: ViewMode.TAIL_SAMPLING, label: 'Tail Sampling', icon: '🐕' },
  { id: ViewMode.WIDE_EVENT, label: 'Wide Events', icon: '↔️' },
  { id: ViewMode.STRUCTURED_LOGS, label: 'Structured Logs', icon: '📝' },
  {
    id: ViewMode.DISTRIBUTED_TRACING,
    label: 'Distributed Tracing',
    icon: '📉',
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleTabClick = (tabId: ViewMode) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <div className={styles.navContainer} ref={menuRef}>
      <motion.button
        className={styles.burgerButton}
        onClick={handleToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label='Toggle Menu'
      >
        <motion.div
          className={styles.burgerLine}
          animate={isOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
        />
        <motion.div
          className={styles.burgerLine}
          animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
        />
        <motion.div
          className={styles.burgerLine}
          animate={isOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdownMenu}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={clsx(
                  styles.menuItem,
                  activeTab === tab.id && styles.menuItemActive,
                )}
                onClick={() => handleTabClick(tab.id as ViewMode)}
              >
                <div className={styles.menuLabel}>
                  <span>{tab.icon}</span>
                  {tab.label}
                </div>
                {activeTab === tab.id && (
                  <motion.div
                    className={styles.activeIndicator}
                    layoutId='active-nav-pill'
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
