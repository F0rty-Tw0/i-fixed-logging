import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './JsonPreviewPanel.module.css';
import { renderColorizedJson } from './utils';

interface JsonPreviewPanelProps {
  jsonPreview: Record<string, unknown>;
  showProblemTooltip: boolean;
  setShowProblemTooltip: (show: boolean) => void;
  highlightTags: string[];
}

export const JsonPreviewPanel: React.FC<JsonPreviewPanelProps> = ({
  jsonPreview,
  showProblemTooltip,
  setShowProblemTooltip,
}) => {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Enriched Wide Event</h2>
        <div className={styles.reportedProblemWrapper}>
          <button
            className={styles.reportedProblemIcon}
            onClick={() => setShowProblemTooltip(!showProblemTooltip)}
            title='View Reported Problem'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'></path>
              <line x1='12' y1='8' x2='12' y2='12'></line>
              <line x1='12' y1='16' x2='12.01' y2='16'></line>
            </svg>
          </button>

          <AnimatePresence>
            {showProblemTooltip && (
              <>
                <motion.div
                  className={styles.problemTooltip}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                >
                  <div className={styles.tooltipArrow} />
                  <div className={styles.tooltipContent}>
                    <div className={styles.tooltipSection}>
                      <strong className={styles.tooltipSectionTitle}>
                        User Reported Issue
                      </strong>
                      <div className={styles.tooltipSectionText}>
                        &quot;I entered the queue, but the page crashed with a
                        &apos;Secure Connection&apos; error after the
                        queue.&quot;
                      </div>
                    </div>
                  </div>
                </motion.div>
                {/* Overlay to catch clicks outside */}
                <div
                  className={styles.tooltipOverlay}
                  onClick={() => setShowProblemTooltip(false)}
                />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className={styles.jsonContainer}>
        <pre className={styles.jsonPre}>{renderColorizedJson(jsonPreview)}</pre>
      </div>
    </div>
  );
};
