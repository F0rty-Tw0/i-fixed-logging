'use client';
'use no memo';

import { useRef, useEffect, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { logStore } from '../core/store/log-store';
import { EVENT_NAMES, LogSeverityId } from '../core/types/domain';
import styles from './VirtualLogList.module.css';
import clsx from 'clsx';
import { generateLogDetails, getLogSource } from '../utils/log-details';

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
            const date = new Date(log.timestamp).toISOString();
            const eventName = EVENT_NAMES[log.eventId] || 'UNKNOWN';

            // Determine severity
            let severity = 'INFO';
            if (log.severity === LogSeverityId.WARN) severity = 'WARN';
            else if (log.severity === LogSeverityId.ERROR) severity = 'ERROR';
            else if (log.severity === LogSeverityId.CRITICAL) severity = 'CRIT';

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className={clsx(
                  styles['log-row-wrapper'],
                  styles['virtual-item'],
                  {
                    [styles['expanded']]: isExpanded,
                  },
                )}
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div
                  className={clsx(
                    styles['log-row'],
                    styles[`row-sev-${severity}`],
                  )}
                  onClick={() => toggleExpand(virtualItem.index)}
                >
                  <span className={styles['col-id']}>#{log.journeyId}</span>
                  <span className={styles['col-ts']}>
                    {date.split('T')[1].replace('Z', '')}
                  </span>
                  <span
                    className={clsx(
                      styles['col-type'],
                      styles[`sev-${severity}`],
                    )}
                  >
                    {severity}
                  </span>
                  <span className={styles['col-service']}>
                    {getLogSource(log.eventId)}
                  </span>
                  <span className={styles['col-wrid']}>
                    WR-{log.waitingRoomId.toString().padStart(2, '0')}
                  </span>
                  <span className={styles['col-cid']}>c-{log.customerId}</span>
                  <span className={styles['col-ip']}>
                    {[
                      (log.ip >>> 24) & 0xff,
                      (log.ip >>> 16) & 0xff,
                      (log.ip >>> 8) & 0xff,
                      log.ip & 0xff,
                    ].join('.')}
                  </span>
                  <span className={styles['col-event']}>{eventName}</span>
                  <span
                    className={clsx(
                      styles['col-msg'],
                      severity !== 'INFO' && styles[`sev-${severity}`],
                    )}
                  >
                    {generateLogDetails(
                      log.journeyId,
                      log.eventId,
                      log.severity,
                      log.waitingRoomId,
                      log.customerId,
                      log.metaIndex,
                      log.ip,
                    ).message || '-'}
                  </span>
                  <span className={styles['col-meta']}>
                    {log.metaIndex > 0 ? `+${log.metaIndex}ms` : '-'}
                  </span>
                </div>
                {isExpanded && (
                  <div className={styles['details-panel']}>
                    <div className={styles['details-header']}>
                      EVENT DETAILS
                    </div>
                    <pre className={styles['json-view']}>
                      {JSON.stringify(
                        generateLogDetails(
                          log.journeyId,
                          log.eventId,
                          log.severity,
                          log.waitingRoomId,
                          log.customerId,
                          log.metaIndex,
                          log.ip,
                        ),
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
