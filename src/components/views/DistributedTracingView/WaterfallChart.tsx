'use client';

import React, { useState, useMemo } from 'react';
import {
  useTraceDetails,
  TraceSpan,
} from '../../../core/hooks/useTraceDetails';
import styles from './WaterfallChart.module.css';
import { EVENT_NAMES, JourneyEvent } from '../../../core/types/domain';
import { motion } from 'framer-motion';
import { SpanTooltip } from './SpanTooltip';

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
  isHovered: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}> = ({ span, totalDuration, isHovered, onMouseEnter, onMouseLeave }) => {
  const left = (span.relativeStart / totalDuration) * 100;
  const width = Math.max((span.duration / totalDuration) * 100, 0.5); // Min width for visibility

  const severityClass = `severity_${(span.severity || 'INFO').toUpperCase()}`;

  return (
    <div className={`${styles.row} ${isHovered ? styles.selected : ''}`}>
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
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {width > 5 && (
            <span className={styles.spanDuration}>{span.duration}ms</span>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  traceId,
  onBack,
}) => {
  const { spans, totalDuration, loading, error } = useTraceDetails(traceId);
  const [hoveredSpanId, setHoveredSpanId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const hoveredSpan = useMemo(() => {
    if (hoveredSpanId === null) return null;
    return spans.find((s) => s.id === hoveredSpanId) || null;
  }, [spans, hoveredSpanId]);

  if (loading && spans.length === 0) {
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
            <h1>Trace #{traceId}</h1>
          </div>
        </div>
        <div className={styles.padding2}>
          {error
            ? error
            : 'No events found for this trace. The trace may have been cleared when the simulation was reset.'}
        </div>
      </div>
    );
  }

  const handleMouseEnter = (e: React.MouseEvent, id: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setHoveredSpanId(id);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredSpanId(null);
    }, 200);
  };

  const handleTooltipEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipLeave = () => {
    setHoveredSpanId(null);
  };

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
              <WaterfallRow
                key={span.id}
                span={span}
                totalDuration={totalDuration}
                isHovered={hoveredSpanId === span.id}
                onMouseEnter={(e) => handleMouseEnter(e, span.id)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>
        </div>

        <SpanTooltip
          span={hoveredSpan}
          position={tooltipPos}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        />
      </div>
    </div>
  );
};
