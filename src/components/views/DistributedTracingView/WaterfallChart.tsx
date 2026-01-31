'use client';

import React, { useState, useMemo } from 'react';
import {
  useTraceDetails,
  TraceSpan,
} from '../../../core/hooks/useTraceDetails';
import styles from './WaterfallChart.module.css';
import { EVENT_NAMES, JourneyEvent } from '../../../core/types/domain';
import { motion, AnimatePresence } from 'framer-motion';

interface WaterfallChartProps {
  traceId: number;
  onBack: () => void;
}

const TimelineHeader: React.FC<{ totalDuration: number }> = ({
  totalDuration,
}) => {
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={styles.timelineHeader}>
      {ticks.map((tick) => (
        <div
          key={tick}
          className={styles.timelineTick}
          style={{ left: `${tick * 100}%` }}
        >
          {Math.round(totalDuration * tick)}ms
        </div>
      ))}
    </div>
  );
};

const WaterfallRow: React.FC<{
  span: TraceSpan;
  totalDuration: number;
  isSelected: boolean;
  onClick: () => void;
}> = ({ span, totalDuration, isSelected, onClick }) => {
  const left = (span.relativeStart / totalDuration) * 100;
  const width = Math.max((span.duration / totalDuration) * 100, 0.5); // Min width for visibility

  const severityClass = `severity_${span.severity || 'INFO'}`;

  return (
    <div
      className={`${styles.row} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <div
        className={styles.rowLabel}
        title={EVENT_NAMES[span.eventId as JourneyEvent] || span.event}
      >
        {EVENT_NAMES[span.eventId as JourneyEvent] || span.event}
      </div>
      <div className={styles.timelineTrack}>
        <motion.div
          className={`${styles.spanBar} ${styles[severityClass]}`}
          style={{ left: `${left}%`, width: `${width}%` }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.3 }}
        >
          {width > 5 && (
            <span className={styles.spanDuration}>{span.duration}ms</span>
          )}
        </motion.div>
      </div>
    </div>
  );
};

import { SpanDetailsModal } from './SpanDetailsModal';

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  traceId,
  onBack,
}) => {
  const { spans, totalDuration, loading, error } = useTraceDetails(traceId);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const selectedSpan = useMemo(() => {
    if (selectedSpanId === null) return null;
    return spans.find((s) => s.id === selectedSpanId) || null;
  }, [spans, selectedSpanId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={onBack} className={styles.backButton}>
            ← Back
          </button>
          <div className={styles.titleSection}>
            <h1>Loading Trace #{traceId}...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || spans.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={onBack} className={styles.backButton}>
            ← Back
          </button>
          <div className={styles.titleSection}>
            <h1>Error or No Data</h1>
          </div>
        </div>
        <div className={styles.padding2}>
          {error ? error : 'No spans found for this trace.'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.flexCenterGap1}>
          <button onClick={onBack} className={styles.backButton}>
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='3'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <line x1='19' y1='12' x2='5' y2='12'></line>
              <polyline points='12 19 5 12 12 5'></polyline>
            </svg>
            BACK
          </button>
          <div className={styles.titleSection}>
            <h1>Trace #{traceId}</h1>

            <span className={styles.statsText}>
              {spans.length} events • {totalDuration}ms
            </span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.chartArea}>
          <TimelineHeader totalDuration={totalDuration} />
          <div className={styles.rowsContainer}>
            {spans.map((span) => (
              <div key={span.id}>
                <WaterfallRow
                  span={span}
                  totalDuration={totalDuration}
                  isSelected={selectedSpanId === span.id}
                  onClick={() => setSelectedSpanId(span.id)}
                />
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selectedSpan && (
            <SpanDetailsModal
              span={selectedSpan}
              onClose={() => setSelectedSpanId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
