'use client';

import React from 'react';
import { TraceSpan } from '../../../core/hooks/useTraceDetails';
import { LogSeverityId } from '../../../core/types/domain';
import { generateLogDetails } from '../../../utils/log-details';
import { clsx } from 'clsx';
import styles from './SpanTooltip.module.css';

interface SpanTooltipProps {
  span: TraceSpan | null;
  position: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const SEVERITY_NAMES = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

export const SpanTooltip: React.FC<SpanTooltipProps> = ({
  span,
  position,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!span) return null;

  // Constants for safe layout assumptions
  const TOOLTIP_WIDTH = 640;
  const TOOLTIP_HEIGHT = 420; // Reduced height as it grows horizontally
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
        <div className={styles.column}>
          <div className={styles.grid}>
            <div className={styles.item}>
              <span className={styles.label}>Trace ID</span>
              <span className={clsx(styles.value, styles.valueHighlight)}>
                {details.trace_id}
              </span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Status</span>
              <span className={styles.value}>{span.event}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Duration</span>
              <span className={styles.value}>{span.latency}ms</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Segment</span>
              <span className={styles.value}>{details.customer_segment}</span>
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
              <span className={styles.label}>IP</span>
              <span className={styles.value}>
                {details.client_ip || '0.0.0.0'}
              </span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Node</span>
              <span className={styles.value}>{details.node}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Waiting Room</span>
              <span className={styles.value}>{details.waiting_room}</span>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.idSection} style={{ paddingTop: 0 }}>
            <span className={styles.label}>Request ID</span>
            <span className={styles.idValue}>{details.request_id}</span>
          </div>

          {details.customer && (
            <div className={styles.idSection}>
              <span className={styles.label}>Customer</span>
              <span className={styles.idValue}>
                {details.customer}{' '}
                {details.years_with_us ? `(${details.years_with_us}y)` : ''}
              </span>
            </div>
          )}

          {Object.entries(details).filter(
            ([key]) =>
              ![
                'trace_id',
                'request_id',
                'client_ip',
                'node',
                'customer',
                'customer_segment',
                'waiting_room',
                'message',
                'timestamp',
                'years_with_us',
                'stack_trace',
                'error_code',
                'warn_code',
                'cause',
                'details',
              ].includes(key),
          ).length > 0 && (
            <div className={styles.metadataSection}>
              <span className={styles.label}>Event Details</span>
              <div className={styles.metadataGrid}>
                {Object.entries(details)
                  .filter(
                    ([key]) =>
                      ![
                        'trace_id',
                        'request_id',
                        'client_ip',
                        'node',
                        'customer',
                        'customer_segment',
                        'waiting_room',
                        'message',
                        'timestamp',
                        'years_with_us',
                      ].includes(key),
                  )
                  .map(([key, value]) => (
                    <div key={key} className={styles.metadataItem}>
                      <span className={styles.metadataLabel}>
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className={styles.metadataValue}>
                        {String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.messageSection}>
          <span className={styles.label}>Event Signature & Stack Trace</span>
          <div className={styles.messageBox}>
            <div className={styles.messageHeader}>
              <div className={styles.messageText}>
                {details.message || 'NO_SIGNATURE_DETECTED'}
              </div>
              {details.error_code && (
                <span className={styles.errorCode}>{details.error_code}</span>
              )}
              {details.warn_code && (
                <span className={styles.warnCode}>{details.warn_code}</span>
              )}
            </div>
            {details.stack_trace && (
              <div className={styles.stackTrace}>{details.stack_trace}</div>
            )}
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
      </div>
    </div>
  );
};
