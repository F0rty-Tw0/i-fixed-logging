import React from 'react';
import clsx from 'clsx';
import { VirtualItem } from '@tanstack/react-virtual';
import { LogSeverityId, EVENT_NAMES } from '../../core/types/domain';
import { generateLogDetails, getLogSource } from '../../utils/log-details';
import styles from './VirtualLogList.module.css';
import { LogSnapshot as LogSnapshotType } from '../../core/store/log-store';

interface VirtualLogRowProps {
  virtualItem: VirtualItem;
  measureElement: (element: Element | null) => void;
  log: LogSnapshotType;
  isExpanded: boolean;
  toggleExpand: (index: number) => void;
}

export const VirtualLogRow: React.FC<VirtualLogRowProps> = React.memo(
  ({ virtualItem, measureElement, log, isExpanded, toggleExpand }) => {
    const date = React.useMemo(
      () =>
        new Date(log.timestamp).toISOString().split('T')[1].replace('Z', ''),
      [log.timestamp],
    );

    const logDetails = React.useMemo(
      () =>
        generateLogDetails(
          log.journeyId,
          log.eventId,
          log.severity,
          log.waitingRoomId,
          log.customerId,
          log.metaIndex,
          log.ip,
        ),
      [
        log.journeyId,
        log.eventId,
        log.severity,
        log.waitingRoomId,
        log.customerId,
        log.metaIndex,
        log.ip,
      ],
    );

    const eventName = React.useMemo(
      () => EVENT_NAMES[log.eventId] || 'UNKNOWN',
      [log.eventId],
    );

    const source = React.useMemo(
      () => getLogSource(log.eventId),
      [log.eventId],
    );

    // Determine severity
    const severity = React.useMemo(() => {
      let sev = 'INFO';
      if (log.severity === LogSeverityId.WARN) sev = 'WARN';
      else if (log.severity === LogSeverityId.ERROR) sev = 'ERROR';
      else if (log.severity === LogSeverityId.CRITICAL) sev = 'CRIT';
      return sev;
    }, [log.severity]);

    const ipAddress = React.useMemo(
      () =>
        [
          (log.ip >>> 24) & 0xff,
          (log.ip >>> 16) & 0xff,
          (log.ip >>> 8) & 0xff,
          log.ip & 0xff,
        ].join('.'),
      [log.ip],
    );

    return (
      <div
        key={virtualItem.key}
        data-index={virtualItem.index}
        ref={measureElement}
        className={clsx(styles['log-row-wrapper'], styles['virtual-item'], {
          [styles['expanded']]: isExpanded,
        })}
        style={{
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        <div
          className={clsx(styles['log-row'], styles[`row-sev-${severity}`])}
          onClick={() => toggleExpand(virtualItem.index)}
        >
          <span className={styles['col-id']}>#{log.journeyId}</span>
          <span className={styles['col-ts']}>{date}</span>
          <span className={clsx(styles['col-type'], styles[`sev-${severity}`])}>
            {severity}
          </span>
          <span className={styles['col-service']}>{source}</span>
          <span className={styles['col-wrid']}>
            WR-{log.waitingRoomId.toString().padStart(2, '0')}
          </span>
          <span className={styles['col-cid']}>c-{log.customerId}</span>
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
            {log.metaIndex > 0 ? `+${log.metaIndex}ms` : '-'}
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
    return (
      prev.isExpanded === next.isExpanded &&
      prev.virtualItem.start === next.virtualItem.start &&
      prev.virtualItem.index === next.virtualItem.index &&
      prev.log.timestamp === next.log.timestamp &&
      prev.log.journeyId === next.log.journeyId &&
      prev.log.eventId === next.log.eventId &&
      prev.log.severity === next.log.severity &&
      prev.log.metaIndex === next.log.metaIndex &&
      prev.log.customerId === next.log.customerId &&
      prev.log.ip === next.log.ip &&
      prev.log.waitingRoomId === next.log.waitingRoomId
    );
  },
);

VirtualLogRow.displayName = 'VirtualLogRow';
