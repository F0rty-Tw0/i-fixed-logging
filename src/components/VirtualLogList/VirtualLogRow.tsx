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

export const VirtualLogRow: React.FC<VirtualLogRowProps> = ({
  virtualItem,
  measureElement,
  log,
  isExpanded,
  toggleExpand,
}) => {
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
        <span className={styles['col-ts']}>
          {date.split('T')[1].replace('Z', '')}
        </span>
        <span className={clsx(styles['col-type'], styles[`sev-${severity}`])}>
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
          <div className={styles['details-header']}>EVENT DETAILS</div>
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
};
