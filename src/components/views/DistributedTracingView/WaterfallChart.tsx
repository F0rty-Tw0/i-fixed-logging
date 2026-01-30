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

const SpanDetailsModal: React.FC<{ span: TraceSpan; onClose: () => void }> = ({
  span,
  onClose,
}) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <motion.div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.3 }}
      >
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2>Span Details</h2>
            <div className={styles.badge}>{span.severity}</div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
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
              <line x1='18' y1='6' x2='6' y2='18'></line>
              <line x1='6' y1='6' x2='18' y2='18'></line>
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Event</span>
            <span className={styles.value}>
              {EVENT_NAMES[span.eventId as JourneyEvent] || span.event}
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.label}>Timestamp</span>
            <span className={styles.value}>
              {new Date(span.timestamp).toISOString()}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            <div className={styles.detailItem}>
              <span className={styles.label}>Duration</span>
              <span className={styles.value}>{span.duration}ms</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Relative Start</span>
              <span className={styles.value}>+{span.relativeStart}ms</span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            <div className={styles.detailItem}>
              <span className={styles.label}>Customer ID</span>
              <span className={styles.value}>
                {span.raw.customer_id as string}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Segment</span>
              <span className={styles.value}>
                {span.raw.customer_segment as string}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            <div className={styles.detailItem}>
              <span className={styles.label}>IP Address</span>
              <span className={styles.value}>{span.raw.ip as string}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Region</span>
              <span className={styles.value}>{span.raw.region as string}</span>
            </div>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.label}>User Agent</span>
            <span className={styles.value}>
              {span.raw.user_agent as string}
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.label}>Waiting Room ID</span>
            <span className={styles.value}>
              {span.raw.waiting_room_id as string}
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.label}>Raw Data</span>
            <pre className={styles.jsonBlock}>
              {JSON.stringify(span.raw, null, 2)}
            </pre>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

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
        <div style={{ padding: '2rem' }}>
          {error ? error : 'No spans found for this trace.'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className={styles.backButton}>
            ← Back
          </button>
          <div className={styles.titleSection}>
            <h1>Trace #{traceId}</h1>
            <span style={{ fontSize: '0.8rem', color: '#71717a' }}>
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
              <WaterfallRow
                key={span.id}
                span={span}
                totalDuration={totalDuration}
                isSelected={selectedSpanId === span.id}
                onClick={() => setSelectedSpanId(span.id)}
              />
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
