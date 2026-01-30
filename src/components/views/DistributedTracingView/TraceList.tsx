'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTraceAggregation } from '../../../core/hooks/useTraceAggregation';
import { EVENT_NAMES, JourneyEvent } from '../../../core/types/domain';
import styles from './TraceList.module.css';
import { motion } from 'framer-motion';

const StatusBadge: React.FC<{ event: JourneyEvent }> = ({ event }) => {
  const name = EVENT_NAMES[event];
  const colorClass = `status_${name.toUpperCase()}`;

  return (
    <span className={`${styles.badge} ${styles[colorClass] || ''}`}>
      {name}
    </span>
  );
};

type SortField = 'traceId' | 'duration' | 'eventCount' | 'startTime';
type SortDirection = 'asc' | 'desc';

export const TraceList: React.FC<{ onSelectTrace?: (id: number) => void }> = ({
  onSelectTrace,
}) => {
  const traces = useTraceAggregation();
  const parentRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'startTime' ? 'desc' : 'asc');
    }
  };

  const filteredTraces = useMemo(() => {
    let result = traces;

    // Apply filter
    if (filter) {
      const lower = filter.toLowerCase();
      result = traces.filter(
        (t) =>
          t.traceId.toString().includes(lower) ||
          EVENT_NAMES[t.lastEvent].toLowerCase().includes(lower),
      );
    }

    // Apply sorting
    const sorted = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'traceId':
          comparison = a.traceId - b.traceId;
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'eventCount':
          comparison = a.eventCount - b.eventCount;
          break;
        case 'startTime':
          comparison = a.startTime - b.startTime;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [traces, filter, sortField, sortDirection]);

  const virtualizer = useVirtualizer({
    count: filteredTraces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 20,
  });

  const maxDuration = useMemo(() => {
    return Math.max(...traces.map((t) => t.duration), 1);
  }, [traces]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <motion.div
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <polyline points='22 12 18 12 15 21 9 3 6 12 2 12'></polyline>
            </svg>
          </motion.div>
          <h1>Live Traces</h1>
          <input
            type='text'
            placeholder='Filter...'
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterInput}
          />
        </div>

        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active Traces</span>
            <span className={styles.statValue}>{traces.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Avg Latency</span>
            <span className={styles.statValue}>
              {(
                traces.reduce((acc, t) => acc + t.duration, 0) /
                (traces.length || 1)
              ).toFixed(0)}
              ms
            </span>
          </div>
        </div>
      </div>

      <div className={styles.listContainer} ref={parentRef}>
        <div className={styles.listHeader}>
          <div
            className={styles.sortableHeader}
            onClick={() => handleSort('traceId')}
          >
            Trace ID
            {sortField === 'traceId' && (
              <span className={styles.sortIndicator}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div>Status</div>
          <div
            className={styles.sortableHeader}
            onClick={() => handleSort('duration')}
          >
            Duration
            {sortField === 'duration' && (
              <span className={styles.sortIndicator}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div
            className={styles.sortableHeader}
            onClick={() => handleSort('duration')}
            title='Visual bar showing trace duration (time from first to last event)'
          >
            Timeline
            {sortField === 'duration' && (
              <span className={styles.sortIndicator}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div>Segment</div>
          <div
            className={styles.sortableHeader}
            onClick={() => handleSort('eventCount')}
          >
            Events
            {sortField === 'eventCount' && (
              <span className={styles.sortIndicator}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const trace = filteredTraces[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className={styles.listRow}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onSelectTrace?.(trace.traceId)}
              >
                <div className={`${styles.cell} ${styles.traceId}`}>
                  #{trace.traceId}
                </div>
                <div className={styles.cell}>
                  <StatusBadge event={trace.lastEvent} />
                </div>
                <div className={`${styles.cell} ${styles.duration}`}>
                  {trace.duration}ms
                </div>
                <div className={styles.cell}>
                  <div className={styles.durationBar}>
                    <div
                      className={styles.durationFill}
                      style={{
                        width: `${Math.min((trace.duration / maxDuration) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className={styles.cell}>
                  <span
                    className={`${styles.badge} ${styles[`badge_${trace.customerSegment === 1 ? 'VIP' : 'STANDARD'}`]}`}
                  >
                    {trace.customerSegment === 1 ? 'VIP' : 'STANDARD'}
                  </span>
                </div>
                <div className={styles.cell}>{trace.eventCount}</div>
              </div>
            );
          })}
        </div>

        {filteredTraces.length === 0 && (
          <div className={styles.emptyState}>
            <p>No active traces found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
