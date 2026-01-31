'use client';
'use no memo';

import { useRef, useEffect, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { logStore } from '../../core/store';
import styles from './VirtualLogList.module.css';
import { VirtualLogRow } from './VirtualLogRow';

// Stable function references for useSyncExternalStore
const subscribeToStore = (cb: () => void) => logStore.subscribe(cb);
const getLogCountSnapshot = () => logStore.getLength();
const getTotalIngestedSnapshot = () => logStore.getTotalIngested();
const getSearchStatusSnapshot = () => logStore.getSearchStatus();
const getServerLogCountSnapshot = () => 0;
const INITIAL_SEARCH_STATUS = {
  isSearching: false,
  progress: 0,
  query: '',
  matchCount: 0,
  isFiltered: false,
  disabled: false,
};
const getServerSearchStatusSnapshot = () => INITIAL_SEARCH_STATUS;

export const VirtualLogList = () => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Create a subscribe function that forces re-render based on store updates
  // We use useSyncExternalStore to subscribe to logStore changes
  const logCount = useSyncExternalStore(
    subscribeToStore,
    getLogCountSnapshot,
    getServerLogCountSnapshot,
  );

  const totalIngested = useSyncExternalStore(
    subscribeToStore,
    getTotalIngestedSnapshot,
    getServerLogCountSnapshot,
  );

  const searchStatus = useSyncExternalStore(
    subscribeToStore,
    getSearchStatusSnapshot,
    getServerSearchStatusSnapshot,
  );

  const isFiltered = searchStatus.isFiltered;
  // Use absolute count if not filtered to prevent flashing on buffer shifts
  const effectiveCount = isFiltered ? logCount : totalIngested;

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: effectiveCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // Matched to actual CSS height (line-height + padding) + border
    overscan: 12, // Reduced overscan for better performance during bursts
    getItemKey: (index) => index, // Stable keys using indices
  });

  // Auto-scroll logic
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Use a layout effect or just a regular effect to scroll when count changes
  useEffect(() => {
    if (
      isAutoScroll &&
      expandedIndex === null &&
      effectiveCount > 0 &&
      parentRef.current
    ) {
      virtualizer.scrollToIndex(effectiveCount - 1, {
        align: 'end',
      });
    }
  }, [effectiveCount, isAutoScroll, expandedIndex, virtualizer]);

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
    // If we expand, disable auto-scroll so the user can read
    if (expandedIndex !== index) {
      setIsAutoScroll(false);
    }
  };

  const lastScrollTopRef = useRef(0);

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
          const target = e.currentTarget;
          const currentScrollTop = target.scrollTop;
          const scrollDiff = lastScrollTopRef.current - currentScrollTop;
          const isScrollingUp = scrollDiff > 2; // Threshold to avoid jitter

          const distanceFromBottom =
            target.scrollHeight - currentScrollTop - target.clientHeight;

          // If we're near the bottom, re-enable auto-scroll
          if (distanceFromBottom < 30) {
            if (!isAutoScroll) setIsAutoScroll(true);
          } else if (isScrollingUp && isAutoScroll) {
            // Only disable auto-scroll if the user explicitly scrolls UP
            setIsAutoScroll(false);
          }

          lastScrollTopRef.current = currentScrollTop;
        }}
      >
        <div
          className={styles['virtual-container']}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const log = isFiltered
              ? logStore.getSnapshot(virtualItem.index)
              : logStore.getSnapshotByAbsoluteIndex(virtualItem.index);

            if (!log) {
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                />
              );
            }

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
