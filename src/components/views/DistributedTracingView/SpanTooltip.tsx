'use client';

import React from 'react';
import { TraceSpan } from '../../../core/hooks/useTraceDetails';
import { LogSeverityId } from '../../../core/types/domain';
import { generateLogDetails, getLogSource } from '../../../utils/log-details';
import { clsx } from 'clsx';
import styles from './SpanTooltip.module.css';

interface SpanTooltipProps {
  span: TraceSpan | null;
  position: { x: number; y: number };
}

const SEVERITY_NAMES = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

export const SpanTooltip: React.FC<SpanTooltipProps> = ({ span, position }) => {
  if (!span) return null;

  // Constants for safe layout assumptions
  const TOOLTIP_WIDTH = 340;
  const TOOLTIP_HEIGHT = 380; // Approximate max height
  const PADDING = 20;

  // Calculate smart position
  let x = position.x;
  let y = position.y;

  // Flip left if too close to right edge
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  if (x + TOOLTIP_WIDTH + PADDING > windowWidth) {
    x = x - TOOLTIP_WIDTH - PADDING;
  }

  // Move up if too close to bottom edge
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  if (y + TOOLTIP_HEIGHT + PADDING > windowHeight) {
    y = windowHeight - TOOLTIP_HEIGHT - PADDING;
  }

  // Ensure it doesn't go off top
  y = Math.max(PADDING, y);

  /* Safe guard for eventId to prevent crashes if unknown ID comes in */
  const safeEventId =
    span.eventId >= 0 && span.eventId <= 14 ? span.eventId : 0;

  const severityIdMap: Record<string, number> = {
    INFO: LogSeverityId.INFO,
    WARN: LogSeverityId.WARN,
    ERROR: LogSeverityId.ERROR,
    BLOCK: LogSeverityId.CRITICAL,
    CRITICAL: LogSeverityId.CRITICAL,
  };

  const sevId = severityIdMap[span.severity] ?? LogSeverityId.INFO;
  const isError =
    sevId === LogSeverityId.ERROR || sevId === LogSeverityId.CRITICAL;
  const isWarn = sevId === LogSeverityId.WARN;
  const isInfo = sevId === LogSeverityId.INFO;

  const rawData = span.raw || {};
  const journeyId = (rawData.journey_id as number) ?? 0;
  const waitingRoomId = (rawData.waiting_room_id as number) ?? 0;
  const customerId = (rawData.customer_id as number) ?? 0;
  const ip = (rawData.ip_numeric as number) ?? 0;

  const details = generateLogDetails(
    journeyId,
    safeEventId,
    sevId,
    waitingRoomId,
    customerId,
    span.latency,
    ip,
  );

  return (
    <div
      className={styles.tooltip}
      style={{
        top: y,
        left: x,
      }}
    >
      <div
        className={clsx(styles.severityBar, {
          [styles.severityBarError]: isError,
          [styles.severityBarWarn]: isWarn,
          [styles.severityBarInfo]: isInfo,
        })}
      />

      <div className={styles.header}>
        <span className={styles.headerTitle}>Telemetry Probe</span>
        <div className={styles.logType}>{span.event}</div>
      </div>

      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.item}>
            <span className={styles.label}>Journey ID</span>
            <span className={clsx(styles.value, styles.valueHighlight)}>
              #{journeyId}
            </span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Severity</span>
            <span
              className={clsx(styles.value, {
                'text-error': isError,
                'text-warning': isWarn,
                'text-info': isInfo,
              })}
            >
              {SEVERITY_NAMES[sevId] || span.severity}
            </span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Source</span>
            <span className={styles.value}>{getLogSource(span.eventId)}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Room ID</span>
            <span className={styles.value}>
              {details.waiting_room || 'N/A'}
            </span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Customer</span>
            <span className={styles.value}>{details.customer_segment}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Client IP</span>
            <span className={styles.value}>
              {details.client_ip || '0.0.0.0'}
            </span>
          </div>
        </div>

        <div className={styles.messageSection}>
          <span className={styles.label}>Event Signature</span>
          <div className={styles.messageBox}>
            {details.message || 'NO_SIGNATURE_DETECTED'}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.timestamp}>
          {new Date(span.timestamp)
            .toISOString()
            .replace('T', ' ')
            .replace('Z', '')}
        </span>
        <div className={styles.durationTag}>Δ {span.latency}ms</div>
      </div>
    </div>
  );
};
