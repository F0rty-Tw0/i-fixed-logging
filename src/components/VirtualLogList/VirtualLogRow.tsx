import React from 'react';
import clsx from 'clsx';
import { VirtualItem } from '@tanstack/react-virtual';
import { LogSeverityId, EVENT_NAMES } from '../../core/types/domain';
import { generateLogDetails, getLogSource } from '../../utils/log-details';
import { logStore } from '../../core/store';
import { REGIONS } from '../../core/constants';
import styles from './VirtualLogList.module.css';
import Link from 'next/link';

interface VirtualLogRowProps {
  virtualItem: VirtualItem;
  measureElement?: (element: Element | null | undefined) => void;
  absIndex: number;
  isExpanded: boolean;
  toggleExpand: (index: number) => void;
  gridTemplateColumns: string;
}

export const VirtualLogRow: React.FC<VirtualLogRowProps> = React.memo(
  ({
    virtualItem,
    measureElement,
    absIndex,
    isExpanded,
    toggleExpand,
    gridTemplateColumns,
  }) => {
    // Read properties directly from logStore using columnar accessors
    // This avoids allocating LogSnapshot objects
    const timestamp = logStore.getTimestamp(absIndex);
    const eventId = logStore.getEventId(absIndex);
    const severityId = logStore.getSeverity(absIndex);
    const metaIndex = logStore.getMetaIndex(absIndex);
    const customerId = logStore.getCustomerId(absIndex);
    const customerSegment = logStore.getCustomerSegment(absIndex);
    const waitingRoomId = logStore.getWaitingRoomId(absIndex);
    const ip = logStore.getIp(absIndex);
    const regionIdx = logStore.getRegion(absIndex);
    const journeyId = logStore.getJourneyId(absIndex);

    const date = React.useMemo(() => {
      if (timestamp <= 0) return '';
      try {
        return new Date(timestamp).toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      } catch (e) {
        return '';
      }
    }, [timestamp]);

    const fullTime = React.useMemo(() => {
      if (timestamp <= 0) return '';
      return new Date(timestamp).toLocaleTimeString();
    }, [timestamp]);

    // Only generate full details if expanded, otherwise just get the message lazily
    const logDetails = React.useMemo(() => {
      if (absIndex < 0) return { message: '' };
      if (!isExpanded) {
        // Light version for the main list - only what's needed for the message column
        // We can optimize generateLogDetails later, but for now we only call it if we have to.
        return generateLogDetails(
          journeyId,
          eventId,
          severityId,
          waitingRoomId,
          customerId,
          metaIndex,
          ip,
          absIndex, // Pass absIndex for LRU caching
        );
      }
      return generateLogDetails(
        journeyId,
        eventId,
        severityId,
        waitingRoomId,
        customerId,
        metaIndex,
        ip,
        absIndex, // Pass absIndex for LRU caching
      );
    }, [
      isExpanded,
      journeyId,
      eventId,
      severityId,
      waitingRoomId,
      customerId,
      metaIndex,
      ip,
      absIndex,
    ]);

    const eventName = React.useMemo(
      () => EVENT_NAMES[eventId] || 'UNKNOWN',
      [eventId],
    );

    const source = React.useMemo(() => getLogSource(eventId), [eventId]);

    const regionName = React.useMemo(
      () => REGIONS[regionIdx] || 'UNKNOWN',
      [regionIdx],
    );

    // Determine severity string
    const severity = React.useMemo(() => {
      if (severityId === LogSeverityId.WARN) return 'WARN';
      if (severityId === LogSeverityId.ERROR) return 'ERROR';
      if (severityId === LogSeverityId.CRITICAL) return 'CRIT';
      return 'INFO';
    }, [severityId]);

    const ipAddress = React.useMemo(() => {
      if (absIndex < 0) return '';
      return [
        (ip >>> 24) & 0xff,
        (ip >>> 16) & 0xff,
        (ip >>> 8) & 0xff,
        ip & 0xff,
      ].join('.');
    }, [ip, absIndex]);

    const isVip = customerSegment === 1;

    // Final safety check before rendering - move it here to avoid hook violation
    if (absIndex < 0) {
      return (
        <div
          ref={measureElement}
          className={clsx(styles['log-row-wrapper'], styles['virtual-item'])}
          style={{
            transform: `translate3d(0, ${virtualItem.start}px, 0)`,
            willChange: 'transform',
            height: virtualItem.size,
          }}
        />
      );
    }

    const isSlow = metaIndex > 200;

    return (
      <div
        key={virtualItem.key}
        data-index={virtualItem.index}
        ref={measureElement}
        className={clsx(styles['log-row-wrapper'], styles['virtual-item'], {
          [styles['expanded']]: isExpanded,
        })}
        style={{
          transform: `translate3d(0, ${virtualItem.start}px, 0)`,
          willChange: 'transform',
        }}
      >
        <div
          className={clsx(styles['log-row'])}
          onClick={() => toggleExpand(virtualItem.index)}
          style={{ gridTemplateColumns }}
        >
          <div className={styles.cell}>
            <Link
              href={`/distributed-tracing?traceId=${journeyId}`}
              onClick={(e) => e.stopPropagation()}
              className={styles.traceLink}
            >
              {journeyId}
            </Link>
          </div>
          <div
            className={clsx(styles.cell, styles['timestamp-cell'])}
            title={fullTime}
          >
            {date}
          </div>
          <div className={styles.cell}>
            <span
              className={clsx(
                styles['severity-badge'],
                styles[`severity-${severity}`],
              )}
            >
              {severity}
            </span>
          </div>
          <div
            className={styles.cell}
            style={{ color: 'var(--text-secondary)' }}
          >
            {source}
          </div>
          <div className={styles.cell} style={{ color: 'var(--text-muted)' }}>
            {waitingRoomId}
          </div>
          <div className={styles.cell}>
            <span
              className={clsx(
                styles.badge,
                isVip ? styles['badge-VIP'] : styles['badge-STANDARD'],
              )}
            >
              {isVip ? 'VIP' : 'STANDARD'}
            </span>
          </div>
          <div className={styles.cell} style={{ color: 'var(--text-muted)' }}>
            {customerId}
          </div>
          <div className={styles.cell} style={{ color: 'var(--text-muted)' }}>
            {regionName}
          </div>
          <div className={styles.cell} style={{ color: 'var(--text-muted)' }}>
            {ipAddress}
          </div>
          <div className={clsx(styles.cell, styles['event-name'])}>
            {eventName}
          </div>
          <div
            className={clsx(styles.cell, styles['message-text'])}
            title={logDetails.message}
          >
            {logDetails.message || '-'}
          </div>
          <div className={styles.cell} style={{ justifyContent: 'flex-end' }}>
            <span
              className={
                isSlow ? styles['latency-slow'] : styles['latency-cell']
              }
            >
              {metaIndex > 0 ? `${metaIndex}ms` : '-'}
            </span>
          </div>
        </div>
        {isExpanded && (
          <div className={styles['details-panel']}>
            <div className={styles['details-header']}>EVENT DETAILS</div>
            <pre className={styles['json-view']}>
              {JSON.stringify(logDetails, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    // Extremely fast comparison.
    // Note: If customer segment could change for the same index/journey, we'd need to check it too.
    // But logs are immutable relative to absIndex.
    return (
      prev.absIndex === next.absIndex &&
      prev.isExpanded === next.isExpanded &&
      prev.virtualItem.start === next.virtualItem.start &&
      prev.gridTemplateColumns === next.gridTemplateColumns
    );
  },
);

VirtualLogRow.displayName = 'VirtualLogRow';
