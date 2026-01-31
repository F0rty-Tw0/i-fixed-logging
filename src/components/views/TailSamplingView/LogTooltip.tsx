import React from 'react';
import clsx from 'clsx';
import { LogSeverityId, EVENT_NAMES } from '../../../core/types/domain';
import { generateLogDetails, getLogSource } from '../../../utils/log-details';
import styles from './TailSamplingView.module.css';

// Type from LogStore logic, we can define a subset if we don't carry the full type,
// but let's define an interface for the log snapshot as used here.
export interface LogSnapshot {
  timestamp: number;
  journeyId: number;
  eventId: number;
  severity: number;
  metaIndex: number;
  customerId: number;
  ip: number;
  waitingRoomId: number;
}

// Or better, import the type from log-store if exported (Wait, LogSnapshot is exported in log-store.ts but it is part of internal implementation details there, maybe I should duplicate or just use usage-based typing)
// Checking log-store.ts: export type LogSnapshot = ...
// So I can import it.

const SEVERITY_NAMES = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

interface LogTooltipProps {
  hoveredLog: LogSnapshot | null;
  tooltipPos: { x: number; y: number };
}

export const LogTooltip: React.FC<LogTooltipProps> = ({
  hoveredLog,
  tooltipPos,
}) => {
  if (!hoveredLog) return null;

  return (
    <div
      className={styles.tooltip}
      style={{
        top: Math.min(tooltipPos.y, window.innerHeight - 320), // Adjusted for taller tooltip
        left: Math.min(tooltipPos.x, window.innerWidth - 220),
      }}
    >
      <div className={styles.tooltipHeader}>Log Details</div>
      <div className={styles.tooltipBody}>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ JID ]</span>
          <span className={styles.tooltipValue}>#{hoveredLog.journeyId}</span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ TIME ]</span>
          <span className={styles.tooltipValue}>
            {new Date(hoveredLog.timestamp)
              .toISOString()
              .split('T')[1]
              .replace('Z', '')}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ SEV ]</span>
          <span
            className={clsx(styles.tooltipValue, {
              [styles.tooltipValueError]:
                hoveredLog.severity === LogSeverityId.ERROR ||
                hoveredLog.severity === LogSeverityId.CRITICAL,
              [styles.tooltipValueWarn]:
                hoveredLog.severity === LogSeverityId.WARN,
            })}
          >
            {SEVERITY_NAMES[hoveredLog.severity]}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ SRC ]</span>
          <span className={styles.tooltipValue}>
            {getLogSource(hoveredLog.eventId)}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ WR_ID ]</span>
          <span className={styles.tooltipValue}>
            WR-{hoveredLog.waitingRoomId.toString().padStart(2, '0')}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ CUST ]</span>
          <span className={styles.tooltipValue}>c-{hoveredLog.customerId}</span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ IP_V4 ]</span>
          <span className={styles.tooltipValue}>
            {(hoveredLog.ip >>> 24) & 0xff}.{(hoveredLog.ip >>> 16) & 0xff}.
            {(hoveredLog.ip >>> 8) & 0xff}.{hoveredLog.ip & 0xff}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ EVENT ]</span>
          <span className={styles.tooltipValue}>
            {EVENT_NAMES[hoveredLog.eventId as keyof typeof EVENT_NAMES]}
          </span>
        </div>
        <div className={`${styles.tooltipRow} ${styles.tooltipRowFlexStart}`}>
          <span className={styles.tooltipLabel}>[ MESSAGE ]</span>
          <span
            className={`${styles.tooltipValue} ${styles.tooltipValueMessage}`}
          >
            {generateLogDetails(
              hoveredLog.journeyId,
              hoveredLog.eventId,
              hoveredLog.severity,
              hoveredLog.waitingRoomId,
              hoveredLog.customerId,
              hoveredLog.metaIndex,
              hoveredLog.ip,
            ).message || '-'}
          </span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>[ LATENCY ]</span>
          <span className={styles.tooltipValue}>
            {hoveredLog.metaIndex > 0 ? `+${hoveredLog.metaIndex}ms` : '-'}
          </span>
        </div>
      </div>
    </div>
  );
};
