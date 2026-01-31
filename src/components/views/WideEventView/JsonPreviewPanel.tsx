import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './JsonPreviewPanel.module.css';
import { renderColorizedJson } from './utils';

interface JsonPreviewPanelProps {
  jsonPreview: Record<string, unknown>;
  showProblemTooltip: boolean;
  setShowProblemTooltip: (show: boolean) => void;
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
            ❓
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
