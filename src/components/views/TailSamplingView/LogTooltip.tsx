import clsx from 'clsx';
import { LogSeverityId, EVENT_NAMES } from '../../../core/types/domain';
import { generateLogDetails } from '../../../utils/log-details';
import styles from './LogTooltip.module.css';

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

const SEVERITY_NAMES = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

interface LogTooltipProps {
  hoveredLog: LogSnapshot | null;
  tooltipPos: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const LogTooltip: React.FC<LogTooltipProps> = ({
  hoveredLog,
  tooltipPos,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!hoveredLog) return null;

  // Constants for safe layout assumptions
  const TOOLTIP_WIDTH = 640;
  const TOOLTIP_HEIGHT = 420; // Reduced height as it grows horizontally
  const PADDING = 20;

  // Calculate smart position during render to avoid setState in effects
  let x = tooltipPos.x;
  let y = tooltipPos.y - 335; // Shift up slightly to avoid cursor overlap

  // Flip left if too close to right edge
  if (x + TOOLTIP_WIDTH + PADDING > window.innerWidth) {
    x = x - TOOLTIP_WIDTH - PADDING;
  }

  // Move up if too close to bottom edge
  if (y + TOOLTIP_HEIGHT + PADDING > window.innerHeight) {
    y = window.innerHeight - TOOLTIP_HEIGHT - PADDING;
  }

  // Ensure it doesn't go off top
  y = Math.max(PADDING, y);

  const isError =
    hoveredLog.severity === LogSeverityId.ERROR ||
    hoveredLog.severity === LogSeverityId.CRITICAL;
  const isWarn = hoveredLog.severity === LogSeverityId.WARN;
  const isInfo = hoveredLog.severity === LogSeverityId.INFO;

  const details = generateLogDetails(
    hoveredLog.journeyId,
    hoveredLog.eventId,
    hoveredLog.severity,
    hoveredLog.waitingRoomId,
    hoveredLog.customerId,
    hoveredLog.metaIndex,
    hoveredLog.ip,
    undefined, // absIndex
    hoveredLog.timestamp,
  );

  const formattedIp = `${(hoveredLog.ip >>> 24) & 0xff}.${
    (hoveredLog.ip >>> 16) & 0xff
  }.${(hoveredLog.ip >>> 8) & 0xff}.${hoveredLog.ip & 0xff}`;

  const eventName =
    EVENT_NAMES[hoveredLog.eventId as keyof typeof EVENT_NAMES] ||
    'UNKNOWN_EVENT';

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
        <div className={styles.logType}>{eventName}</div>
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
              <span className={styles.value}>{eventName}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Duration</span>
              <span className={styles.value}>{hoveredLog.metaIndex}ms</span>
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
                {SEVERITY_NAMES[hoveredLog.severity]}
              </span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>IP</span>
              <span className={styles.value}>{formattedIp}</span>
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
                        'stack_trace',
                        'error_code',
                        'warn_code',
                        'cause',
                        'details',
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
            {details.cause && details.cause !== details.message && (
              <div className={styles.stackTrace}>
                <strong>Cause:</strong> {details.cause}
              </div>
            )}
            {details.stack_trace && (
              <div className={styles.stackTrace}>{details.stack_trace}</div>
            )}
            {details.details &&
              details.details !== 'Standard event processing' && (
                <div className={styles.stackTrace}>{details.details}</div>
              )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.timestamp}>
          {new Date(hoveredLog.timestamp)
            .toISOString()
            .replace('T', ' ')
            .replace('Z', '')}
        </span>
      </div>
    </div>
  );
};
