'use client';
'use no memo';

import { useRef, useEffect, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { logStore } from '../core/store/log-store';
import styles from './VirtualLogList.module.css';
import { VirtualLogRow } from './VirtualLogList/VirtualLogRow';

export const VirtualLogList = () => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Create a subscribe function that forces re-render based on store updates
  // We use useSyncExternalStore to subscribe to logStore changes
  const logCount = useSyncExternalStore(
    (cb) => logStore.subscribe(cb),
    () => logStore.getLength(),
    () => 0,
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: logCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24, // 24px per row
    overscan: 10,
  });

  // Auto-scroll logic
  // If user scrolls up, we stop auto-scrolling
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Only auto-scroll if NOT inspecting a row (expandedIndex is null) AND auto-scroll is enabled
    if (
      isAutoScroll &&
      parentRef.current &&
      expandedIndex === null &&
      logCount > 0
    ) {
      virtualizer.scrollToIndex(logCount - 1, { align: 'end' });
    }
  }, [logCount, isAutoScroll, virtualizer, expandedIndex]);

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
    // If we expand, disable auto-scroll so the user can read
    if (expandedIndex !== index) {
      setIsAutoScroll(false);
    }
  };

  return (
    <div className={styles['log-container']}>
      <div className={styles['header-row']}>
        <span className={styles['col-id']}>JID</span>
        <span className={styles['col-ts']}>TIME</span>
        <span className={styles['col-type']}>TYPE</span>
        <span className={styles['col-service']}>SERVICE</span>
        <span className={styles['col-wrid']}>WR ID</span>
        <span className={styles['col-cid']}>CUST ID</span>
        <span className={styles['col-ip']}>IP</span>
        <span className={styles['col-event']}>EVENT</span>
        <span className={styles['col-msg']}>MESSAGE</span>
        <span className={styles['col-meta']}>LATENCY</span>
      </div>
      <div
        ref={parentRef}
        className={styles['virtual-scroller']}
        onScroll={(e) => {
          // Detect if user scrolled up?
          // Simple: if scrollHeight - scrollTop - clientHeight > 50, disable autoscroll
          const target = e.currentTarget;
          if (
            target.scrollHeight - target.scrollTop - target.clientHeight >
            50
          ) {
            setIsAutoScroll(false);
          } else {
            setIsAutoScroll(true);
          }
        }}
      >
        <div
          className={styles['virtual-container']}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const log = logStore.getSnapshot(virtualItem.index);
            if (!log) return null;

            const isExpanded = expandedIndex === virtualItem.index;

            return (
              <VirtualLogRow
                key={virtualItem.key}
                virtualItem={virtualItem}
                measureElement={virtualizer.measureElement}
                log={log}
                isExpanded={isExpanded}
                toggleExpand={toggleExpand}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
