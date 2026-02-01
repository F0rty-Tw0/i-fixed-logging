'use client';
'use no memo';

import { useRef, useEffect, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { logStore } from '../../core/store';
import styles from './VirtualLogList.module.css';
import { VirtualLogRow } from './VirtualLogRow';
import { EVENT_NAMES } from '../../core/types/domain';
import { REGIONS } from '../../core/constants';
import { getLogSource, generateLogDetails } from '../../utils/log-details';
import { LOG_COLUMN_METADATA } from '../../core/constants/ui';

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

// derive columns from metadata
const COLUMNS_KEYS = Object.keys(LOG_COLUMN_METADATA);
const COLUMNS_CONFIG = Object.values(LOG_COLUMN_METADATA)
  .map((m) => m.width)
  .join(' ');

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
    estimateSize: () => 36, // Adjusted for new row height
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
      <div
        className={styles['header-row']}
        style={{ gridTemplateColumns: COLUMNS_CONFIG }}
      >
        {COLUMNS_KEYS.map((key) => (
          <div key={key} className={styles['header-cell']}>
            {LOG_COLUMN_METADATA[key].label}
          </div>
        ))}
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
                gridTemplateColumns={COLUMNS_CONFIG}
                columns={COLUMNS_KEYS}
                getItem={(col: string) => {
                  switch (col) {
                    case 'journey_id':
                      return logStore.getJourneyId(absIndex);
                    case 'timestamp':
                      return logStore.getTimestamp(absIndex);
                    case 'severity':
                      return logStore.getSeverity(absIndex);
                    case 'service':
                      return getLogSource(logStore.getEventId(absIndex));
                    case 'waiting_room_id':
                      return logStore.getWaitingRoomId(absIndex);
                    case 'customer_segment':
                      return logStore.getCustomerSegment(absIndex);
                    case 'customer_id':
                      return logStore.getCustomerId(absIndex);
                    case 'region':
                      return REGIONS[logStore.getRegion(absIndex)] || 'UNKNOWN';
                    case 'ip': {
                      const ip = logStore.getIp(absIndex);
                      return [
                        (ip >>> 24) & 0xff,
                        (ip >>> 16) & 0xff,
                        (ip >>> 8) & 0xff,
                        ip & 0xff,
                      ].join('.');
                    }
                    case 'event':
                      return (
                        EVENT_NAMES[logStore.getEventId(absIndex)] || 'UNKNOWN'
                      );
                    case 'message': {
                      // generate message lazily
                      return generateLogDetails(
                        logStore.getJourneyId(absIndex),
                        logStore.getEventId(absIndex),
                        logStore.getSeverity(absIndex),
                        logStore.getWaitingRoomId(absIndex),
                        logStore.getCustomerId(absIndex),
                        logStore.getMetaIndex(absIndex),
                        logStore.getIp(absIndex),
                        absIndex,
                        logStore.getTimestamp(absIndex),
                      ).message;
                    }
                    case 'latency':
                      return logStore.getMetaIndex(absIndex);
                    default:
                      return null;
                  }
                }}
                getRowData={() => {
                  return generateLogDetails(
                    logStore.getJourneyId(absIndex),
                    logStore.getEventId(absIndex),
                    logStore.getSeverity(absIndex),
                    logStore.getWaitingRoomId(absIndex),
                    logStore.getCustomerId(absIndex),
                    logStore.getMetaIndex(absIndex),
                    logStore.getIp(absIndex),
                    absIndex,
                    logStore.getTimestamp(absIndex),
                  );
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
