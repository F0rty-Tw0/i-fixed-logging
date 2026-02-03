import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './InvestigationProgress.module.css';
import { GAP_NAMES } from '../../../core/constants';

interface InvestigationProgressProps {
  cluesFound: number;
  totalClues: number;
  rootCauseUnlocked: boolean;
  selectAll: () => void;
  gapCoverage: Record<
    string,
    { selected: number; total: number; hasClue: boolean }
  >;
  activeHighlightCategory: string | null;
  setActiveHighlightCategory: React.Dispatch<
    React.SetStateAction<string | null>
  >;
}

export const InvestigationProgress: React.FC<InvestigationProgressProps> = ({
  cluesFound,
  totalClues,
  rootCauseUnlocked,
  selectAll,
  gapCoverage,
  activeHighlightCategory,
  setActiveHighlightCategory,
}) => {
  return (
    <div className={styles.progressSection}>
      <AnimatePresence>
        {rootCauseUnlocked && (
          <motion.div
            className={styles.rootCause}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.rootCauseHeader}>
              <span>🔓 ROOT CAUSE UNLOCKED</span>
            </div>
            <p className={styles.rootCauseText}>
              <strong>TLS 1.0</strong> + <strong>Sanctioned Region (IR)</strong>{' '}
              + <strong>High Bot Score (0.89)</strong> = Token crypto failure.
              ES256 algorithm requires TLS 1.2+ for secure key derivation.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.progressContent}>
        <div className={styles.progressHeader}>
          <h3 className={styles.progressTitle}>Investigation Progress</h3>
          <div className={styles.clueCounter}>
            <span>
              Clues Found: {cluesFound}/{totalClues}
            </span>
            {rootCauseUnlocked && (
              <button className={styles.selectAllButton} onClick={selectAll}>
                Select All
              </button>
            )}
          </div>
        </div>

        <div className={styles.gapIndicators}>
          {Object.entries(gapCoverage).map(([gap, data]) => {
            const percentage =
              data.total > 0 ? (data.selected / data.total) * 100 : 0;
            let status: 'empty' | 'partial' | 'complete' = 'empty';
            if (percentage >= 50) status = 'complete';
            else if (percentage > 0) status = 'partial';

            return (
              <div
                key={gap}
                className={`${styles.gapItem} ${activeHighlightCategory === gap ? styles.gapActive : ''}`}
                onClick={() =>
                  setActiveHighlightCategory((prev) =>
                    prev === gap ? null : gap,
                  )
                }
                title={`Highlight ${GAP_NAMES[gap as keyof typeof GAP_NAMES]} fields`}
              >
                <div className={`${styles.gapCircle} ${styles[status]}`}>
                  <span>
                    {status === 'empty' && '○'}
                    {status === 'partial' && '◐'}
                    {status === 'complete' && '●'}
                  </span>
                </div>
                <span className={styles.gapName}>
                  {GAP_NAMES[gap as keyof typeof GAP_NAMES]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
