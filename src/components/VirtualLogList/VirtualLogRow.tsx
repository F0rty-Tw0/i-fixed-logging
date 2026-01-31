import React from 'react';
import clsx from 'clsx';
import { VirtualItem } from '@tanstack/react-virtual';
import { LogSeverityId, EVENT_NAMES } from '../../core/types/domain';
import { generateLogDetails, getLogSource } from '../../utils/log-details';
import { logStore } from '../../core/store';
import styles from './VirtualLogList.module.css';

interface VirtualLogRowProps {
  virtualItem: VirtualItem;
  measureElement?: (element: Element | null | undefined) => void;
  absIndex: number;
  isExpanded: boolean;
  toggleExpand: (index: number) => void;
}

export const VirtualLogRow: React.FC<VirtualLogRowProps> = React.memo(
  ({ virtualItem, measureElement, absIndex, isExpanded, toggleExpand }) => {
    // Read properties directly from logStore using columnar accessors
    // This avoids allocating LogSnapshot objects
    const timestamp = logStore.getTimestamp(absIndex);
    const eventId = logStore.getEventId(absIndex);
    const severityId = logStore.getSeverity(absIndex);
    const metaIndex = logStore.getMetaIndex(absIndex);
    const customerId = logStore.getCustomerId(absIndex);
    const waitingRoomId = logStore.getWaitingRoomId(absIndex);
    const ip = logStore.getIp(absIndex);
    const journeyId = logStore.getJourneyId(absIndex);

    const date = React.useMemo(() => {
      if (timestamp <= 0) return '';
      try {
        return new Date(timestamp).toISOString().split('T')[1].replace('Z', '');
      } catch (e) {
        return '';
      }
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
          className={clsx(styles['log-row'], styles[`row-sev-${severity}`])}
          onClick={() => toggleExpand(virtualItem.index)}
        >
          <span className={styles['col-id']}>#{journeyId}</span>
          <span className={styles['col-ts']}>{date}</span>
          <span className={clsx(styles['col-type'], styles[`sev-${severity}`])}>
            {severity}
          </span>
          <span className={styles['col-service']}>{source}</span>
          <span className={styles['col-wrid']}>
            WR-{waitingRoomId.toString().padStart(2, '0')}
          </span>
          <span className={styles['col-cid']}>c-{customerId}</span>
          <span className={styles['col-ip']}>{ipAddress}</span>
          <span className={styles['col-event']}>{eventName}</span>
          <span
            className={clsx(
              styles['col-msg'],
              severity !== 'INFO' && styles[`sev-${severity}`],
            )}
          >
            {logDetails.message || '-'}
          </span>
          <span className={styles['col-meta']}>
            {metaIndex > 0 ? `+${metaIndex}ms` : '-'}
          </span>
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
    // Extremely fast comparison
    return (
      prev.absIndex === next.absIndex &&
      prev.isExpanded === next.isExpanded &&
      prev.virtualItem.start === next.virtualItem.start
    );
  },
);

VirtualLogRow.displayName = 'VirtualLogRow';
