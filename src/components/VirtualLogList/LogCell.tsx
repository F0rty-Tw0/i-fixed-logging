import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from './VirtualLogList.module.css';

interface LogCellProps {
  col: string;
  value: unknown;
}

export const LogCell: React.FC<LogCellProps> = React.memo(({ col, value }) => {
  if (value === null || value === undefined) {
    return <span style={{ opacity: 0.3 }}>-</span>;
  }

  const colLower = col.toLowerCase();

  // Journey ID / Trace Link
  if (colLower === 'journey_id' || colLower === 'id') {
    return (
      <Link
        href={`/distributed-tracing?traceId=${value}`}
        onClick={(e) => e.stopPropagation()}
        className={styles.traceLink}
      >
        {String(value)}
      </Link>
    );
  }

  // Timestamp
  if (colLower === 'timestamp' || colLower === 'time') {
    let timeStr = '';
    let fullTime = '';

    if (typeof value === 'number') {
      try {
        const date = new Date(value);
        timeStr = date.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        fullTime = date.toISOString();
      } catch {
        timeStr = String(value);
      }
    } else {
      timeStr = String(value);
    }

    return (
      <div
        className={styles['timestamp-cell']}
        title={fullTime || String(value)}
      >
        {timeStr}
      </div>
    );
  }

  // Severity / Type
  if (colLower === 'severity' || colLower === 'type') {
    let severity = String(value).toUpperCase();
    // Map standard numeric severities if passed as numbers
    // 0=INFO, 1=WARN, 2=ERROR, 3=CRITICAL/BLOCK
    if (typeof value === 'number') {
      const map = ['INFO', 'WARN', 'ERROR', 'CRIT'];
      severity = map[value] || 'INFO';
    }
    // Handle string inputs that might be full words
    if (severity === 'CRITICAL') severity = 'CRIT';

    return (
      <span
        className={clsx(
          styles['severity-badge'],
          styles[`severity-${severity}`] || '',
        )}
      >
        {severity}
      </span>
    );
  }

  // Latency
  if (
    colLower.includes('latency') ||
    colLower.includes('p99') ||
    colLower.includes('avg')
  ) {
    const numVal =
      typeof value === 'number' ? value : parseFloat(String(value));
    const isSlow = !isNaN(numVal) && numVal > 200;

    return (
      <span
        className={isSlow ? styles['latency-slow'] : styles['latency-cell']}
      >
        {typeof value === 'number' ? `${value.toFixed(0)}ms` : String(value)}
      </span>
    );
  }

  // Customer Segment
  if (colLower === 'customer_segment' || colLower === 'segment') {
    let isVip = false;
    let text = 'STANDARD';
    if (typeof value === 'number') {
      isVip = value === 1;
      text = isVip ? 'VIP' : 'STANDARD';
    } else {
      const str = String(value).toUpperCase();
      isVip = str === 'VIP';
      text = str;
    }

    return (
      <span
        className={clsx(
          styles.badge,
          isVip ? styles['badge-VIP'] : styles['badge-STANDARD'],
        )}
      >
        {text}
      </span>
    );
  }

  // Message
  if (colLower === 'message') {
    return (
      <div className={styles['message-text']} title={String(value)}>
        {String(value)}
      </div>
    );
  }

  // Event Name
  if (colLower === 'event') {
    return (
      <div className={styles['event-name']} title={String(value)}>
        {String(value)}
      </div>
    );
  }

  // Default
  return (
    <span title={String(value)} className={styles.defaultCell}>
      {typeof value === 'number' ? value.toLocaleString() : String(value)}
    </span>
  );
});

LogCell.displayName = 'LogCell';
