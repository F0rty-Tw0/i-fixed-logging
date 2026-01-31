'use client';

import React from 'react';
import { TraceSpan } from '../../../core/hooks/useTraceDetails';
import { EVENT_NAMES, JourneyEvent } from '../../../core/types/domain';
import { motion } from 'framer-motion';
import styles from './SpanDetailsModal.module.css';

interface SpanDetailsModalProps {
  span: TraceSpan;
  onClose: () => void;
}

export const SpanDetailsModal: React.FC<SpanDetailsModalProps> = ({
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
          <div className={styles.flexCenter}>
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

          <div className={styles.gridTwoCol}>
            <div className={styles.detailItem}>
              <span className={styles.label}>Duration</span>
              <span className={styles.value}>{span.duration}ms</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Relative Start</span>
              <span className={styles.value}>+{span.relativeStart}ms</span>
            </div>
          </div>

          <div className={styles.gridTwoCol}>
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

          <div className={styles.gridTwoCol}>
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
