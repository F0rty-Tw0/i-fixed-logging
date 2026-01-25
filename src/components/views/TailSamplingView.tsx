'use client';
'use no memo';

import {
  useRef,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { logStore } from '../../core/store/log-store';
import { LogSeverityId, EVENT_NAMES } from '../../core/types/domain';
import { generateLogDetails, getLogSource } from '../../utils/log-details';
import styles from './TailSamplingView.module.css';

const SEVERITY_NAMES = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

export const TailSamplingView = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Filter state
  const [filters, setFilters] = useState({
    errors: true,
    warnings: true,
    slow: true,
    sampleInfo: true, // Default to sampling enabled? User seemed to want it.
  });

  // Subscribe to log store updates to get tail sampling data
  const { severities, logIndices } = useSyncExternalStore(
    (cb) => logStore.subscribe(cb),
    () => logStore.getTailSamplingData(),
    () => ({ severities: new Uint8Array(0), logIndices: new Int32Array(0) }),
  );

  // Derive hovered log from current store state and hovered index
  const hoveredLog = useMemo(() => {
    if (hoveredIndex === null) return null;

    // Bounds check
    if (hoveredIndex < 0 || hoveredIndex >= severities.length) return null;

    // The view displays logs in chronological order (left to right, wrapping)
    // The severities array is [oldest ... newest]
    // And logIndices is [oldest_physical_idx ... newest_physical_idx]

    const physicalIdx = logIndices[hoveredIndex];
    return logStore.getSnapshotByPhysicalIndex(physicalIdx);
  }, [hoveredIndex, severities.length, logIndices]);

  // Calculate column count
  const columnCount = useMemo(
    () => Math.ceil(severities.length / 15),
    [severities.length],
  );

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: columnCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 16, // 14px + 2px gap
    overscan: 20,
  });

  // Auto-scroll to the latest column
  useEffect(() => {
    if (columnCount > 0) {
      virtualizer.scrollToIndex(columnCount - 1, { align: 'end' });
    }
  }, [columnCount, virtualizer]);

  // Calculate color for a single log square
  const getSquareStyle = (sevId: number, physicalIdx: number) => {
    const isError =
      sevId === LogSeverityId.CRITICAL || sevId === LogSeverityId.ERROR;
    const isWarn = sevId === LogSeverityId.WARN;
    const isInfo = sevId === LogSeverityId.INFO;

    let isVisible = false;

    // Check Error Filter
    if (isError && filters.errors) {
      isVisible = true;
    }

    // Check Warn Filter
    if (isWarn && filters.warnings) {
      isVisible = true;
    }

    // Check Slow Filter (> 1000ms)
    // Access latency directly from store without allocating object
    const latency = logStore.metaIndices[physicalIdx];
    if (filters.slow && latency > 1000) {
      isVisible = true;
    }

    // Check Info Filter
    // If IS NO filter (sampleInfo false) -> Show All
    // If IS filter (sampleInfo true) -> Show 5%
    if (isInfo) {
      if (!filters.sampleInfo) {
        isVisible = true;
      } else if (physicalIdx % 20 === 0) {
        isVisible = true;
      }
    }

    let baseColor = '';
    if (isError) baseColor = 'var(--color-error)';
    else if (isWarn) baseColor = 'var(--color-warn)';
    else if (isInfo) baseColor = 'var(--color-info)';
    else baseColor = 'rgba(255, 255, 255, 0.05)';

    return {
      backgroundColor: baseColor,
      opacity: isVisible ? 0.9 : 0.05,
      filter: isVisible ? 'none' : 'grayscale(100%)',
    };
  };

  const handleSquareEnter = (e: React.MouseEvent, index: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.right + 10, y: rect.top });
    setHoveredIndex(index);
  };

  const handleSquareLeave = () => {
    setHoveredIndex(null);
  };

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.container}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Live Traffic Matrix</h2>
        <p className={styles.subtitle}>
          Each square represents a single log. The grid fills 15x down, then
          moves to the next column. Hover for details.
        </p>
      </div>

      <div className={styles.controls}>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.errors}
            onChange={() => toggleFilter('errors')}
          />
          <span
            className={styles.legendSquare}
            style={{ backgroundColor: 'var(--color-error)' }}
          />
          Errors
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.warnings}
            onChange={() => toggleFilter('warnings')}
          />
          <span
            className={styles.legendSquare}
            style={{ backgroundColor: 'var(--color-warn)' }}
          />
          Warnings
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.slow}
            onChange={() => toggleFilter('slow')}
          />
          Slow (&gt;1s)
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            className={styles.checkbox}
            checked={filters.sampleInfo}
            onChange={() => toggleFilter('sampleInfo')}
          />
          <span
            className={styles.legendSquare}
            style={{ backgroundColor: 'var(--color-info)' }}
          />
          Sample Info (5%)
        </label>
      </div>

      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        {severities.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💎</span>
            <p>
              {logStore.getSearchStatus().query
                ? `No logs matching "${logStore.getSearchStatus().query}"`
                : 'Waiting for incoming logs...'}
            </p>
          </div>
        )}
        <div
          className={styles.virtualTrack}
          style={{
            width: `${virtualizer.getTotalSize()}px`,
            height: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualColumn) => {
            const startIdx = virtualColumn.index * 15;
            const columnSeverities = Array.from(
              severities.subarray(startIdx, startIdx + 15),
            );

            // We need physical indices for this column to check latency
            const columnPhysicalIndices = logIndices.subarray(
              startIdx,
              startIdx + 15,
            );

            return (
              <div
                key={virtualColumn.key}
                className={styles.column}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateX(${virtualColumn.start}px)`,
                  width: '14px',
                }}
              >
                {columnSeverities.map((sevId, rowIdx) => {
                  const actualIndex = startIdx + rowIdx;
                  const physicalIdx = columnPhysicalIndices[rowIdx];

                  return (
                    <div
                      key={rowIdx}
                      className={styles.square}
                      style={getSquareStyle(sevId, physicalIdx)}
                      onMouseEnter={(e) => handleSquareEnter(e, actualIndex)}
                      onMouseLeave={handleSquareLeave}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {hoveredLog && (
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
              <span className={styles.tooltipLabel}>JID</span>
              <span className={styles.tooltipValue}>
                #{hoveredLog.journeyId}
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Time</span>
              <span className={styles.tooltipValue}>
                {new Date(hoveredLog.timestamp)
                  .toISOString()
                  .split('T')[1]
                  .replace('Z', '')}
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Type</span>
              <span
                className={styles.tooltipValue}
                style={{
                  color:
                    hoveredLog.severity === LogSeverityId.ERROR ||
                    hoveredLog.severity === LogSeverityId.CRITICAL
                      ? 'var(--color-error)'
                      : hoveredLog.severity === LogSeverityId.WARN
                        ? 'var(--color-warn)'
                        : '#fff',
                }}
              >
                {SEVERITY_NAMES[hoveredLog.severity]}
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Service</span>
              <span className={styles.tooltipValue}>
                {getLogSource(hoveredLog.eventId)}
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>WR ID</span>
              <span className={styles.tooltipValue}>
                WR-{hoveredLog.waitingRoomId.toString().padStart(2, '0')}
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Cust ID</span>
              <span className={styles.tooltipValue}>
                c-{hoveredLog.customerId}
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>IP</span>
              <span className={styles.tooltipValue}>
                {(hoveredLog.ip >>> 24) & 0xff}.{(hoveredLog.ip >>> 16) & 0xff}.
                {(hoveredLog.ip >>> 8) & 0xff}.{hoveredLog.ip & 0xff}
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Event</span>
              <span className={styles.tooltipValue}>
                {EVENT_NAMES[hoveredLog.eventId]}
              </span>
            </div>
            <div
              className={styles.tooltipRow}
              style={{ alignItems: 'flex-start' }}
            >
              <span className={styles.tooltipLabel}>Message</span>
              <span
                className={styles.tooltipValue}
                style={{
                  maxWidth: '180px',
                  textAlign: 'right',
                  whiteSpace: 'pre-wrap',
                }}
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
              <span className={styles.tooltipLabel}>Latency</span>
              <span className={styles.tooltipValue}>
                {hoveredLog.metaIndex > 0 ? `+${hoveredLog.metaIndex}ms` : '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
