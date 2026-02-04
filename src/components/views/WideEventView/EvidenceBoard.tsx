import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './EvidenceBoard.module.css';
import { ClueDef } from './clues';
import { STEP_COLORS } from '../../../core/constants';
import { JourneyEvent } from '../../../core/types/domain';

interface EvidenceBoardProps {
  foundClues: ClueDef[];
  totalClues: number;
  allFound: boolean;
  usedBulkSelect: boolean;
}

export const EvidenceBoard: React.FC<EvidenceBoardProps> = ({
  foundClues,
  totalClues,
  allFound,
  usedBulkSelect,
}) => {
  return (
    <div className={styles.boardPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Evidence Board</h2>
        <div className={styles.counter}>
          {foundClues.length}/{totalClues}
        </div>
      </div>

      <div className={styles.boardArea}>
        <div className={styles.userIssueCard}>
          <div className={styles.userIssueHeader}>User Reported Issue</div>
          <p className={styles.userIssueText}>
            &ldquo;I entered the queue, but the page crashed with a &apos;Secure
            Connection&apos; error after the queue.&rdquo;
          </p>
        </div>

        <AnimatePresence>
          {foundClues.map((clue, index) => (
            <motion.article
              key={clue.id}
              className={styles.card}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className={styles.pin} />
              <div className={styles.cardMeta}>
                <span className={styles.caseTag}>Evidence</span>
                <span
                  className={styles.stepChip}
                  style={
                    {
                      '--step-color':
                        STEP_COLORS[clue.step as JourneyEvent] ||
                        'var(--text-muted)',
                    } as React.CSSProperties
                  }
                />
              </div>
              <p className={styles.cardText}>{clue.narrativeBeat}</p>
            </motion.article>
          ))}
        </AnimatePresence>

        {usedBulkSelect && (
          <div className={styles.bulkMarker}>Bulk evidence pulled</div>
        )}

        {allFound && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>Case Summary</div>
            <p className={styles.summaryText}>
              TLS 1.0 handshake blocked ES256 signing (requires TLS 1.2+), and
              the request originated from a sanctioned region (IR).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

