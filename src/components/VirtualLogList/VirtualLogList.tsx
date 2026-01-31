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

  // Damping logic: catch up to effectiveCount at a manageable rate
  const [dampedCount, setDampedCount] = useState(effectiveCount);
  const targetCountRef = useRef(effectiveCount);
  const lastUpdateTimeRef = useRef(Date.now());

  // Sync target ref
  useEffect(() => {
    if (targetCountRef.current !== effectiveCount) {
      targetCountRef.current = effectiveCount;
      lastUpdateTimeRef.current = Date.now();
    }
  }, [effectiveCount]);

  useEffect(() => {
    let frameId: number;

    const animate = () => {
      setDampedCount((prev) => {
        const target = targetCountRef.current;
        if (prev === target) return prev;

        // If count decreased (RESET) or we're catastrophically behind, catch up immediately
        const diff = target - prev;
        if (diff < 0 || diff > 50000) {
          return target;
        }

        // Quiet detection: If the stream has stopped for >200ms, catch up instantly
        if (Date.now() - lastUpdateTimeRef.current > 200) {
          return target;
        }

        // 1 log per frame for smooth readability (60 logs/sec)
        return prev + 1;
      });
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: dampedCount,
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
      dampedCount > 0 &&
      parentRef.current
    ) {
      // Throttle auto-scroll to requestAnimationFrame to avoid layout thrashing
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(dampedCount - 1, {
          align: 'end',
        });
      });
    }
  }, [dampedCount, isAutoScroll, expandedIndex, virtualizer]);

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
        <span className={styles['col-id']}>ID</span>
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
            const absIndex = logStore.getAbsoluteIndex(virtualItem.index);
            const isExpanded = expandedIndex === virtualItem.index;

            return (
              <VirtualLogRow
                key={virtualItem.key}
                virtualItem={virtualItem}
                // Only pass measureElement if expanded to avoid thousands of unnecessary measurements
                measureElement={
                  isExpanded ? virtualizer.measureElement : undefined
                }
                absIndex={absIndex}
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
