import clsx from 'clsx';
import { LogSeverityId, EVENT_NAMES } from '../../../core/types/domain';
import { generateLogDetails, getLogSource } from '../../../utils/log-details';
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
}

export const LogTooltip: React.FC<LogTooltipProps> = ({
  hoveredLog,
  tooltipPos,
}) => {
  if (!hoveredLog) return null;

  // Constants for safe layout assumptions
  const TOOLTIP_WIDTH = 340;
  const TOOLTIP_HEIGHT = 380; // Approximate max height
  const PADDING = 20;

  // Calculate smart position during render to avoid setState in effects
  let x = tooltipPos.x;
  let y = tooltipPos.y;

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
        <div className={styles.grid}>
          <div className={styles.item}>
            <span className={styles.label}>Journey ID</span>
            <span className={clsx(styles.value, styles.valueHighlight)}>
              #{hoveredLog.journeyId}
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
              {SEVERITY_NAMES[hoveredLog.severity]}
            </span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Source</span>
            <span className={styles.value}>
              {getLogSource(hoveredLog.eventId)}
            </span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Room ID</span>
            <span className={styles.value}>
              WR-{hoveredLog.waitingRoomId.toString().padStart(2, '0')}
            </span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Customer</span>
            <span className={styles.value}>C-{hoveredLog.customerId}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Client IP</span>
            <span className={styles.value}>{formattedIp}</span>
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
          {new Date(hoveredLog.timestamp)
            .toISOString()
            .replace('T', ' ')
            .replace('Z', '')}
        </span>
        {hoveredLog.metaIndex > 0 && (
          <span className={styles.latencyTag}>+{hoveredLog.metaIndex}ms</span>
        )}
      </div>
    </div>
  );
};
