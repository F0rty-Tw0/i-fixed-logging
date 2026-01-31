import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './JourneyTimeline.module.css';
import { JourneyEvent, EVENT_NAMES } from '../../../core/types/domain';
import { STEP_COLORS } from '../../../core/constants';
import { JOURNEY_FIELDS } from './data';

interface JourneyTimelineProps {
  expandedStep: JourneyEvent | null;
  setExpandedStep: (step: JourneyEvent | null) => void;
  selectedFields: Record<string, boolean>;
  toggleField: (stepId: JourneyEvent, fieldName: string) => void;
  showClues: boolean;
  setShowClues: React.Dispatch<React.SetStateAction<boolean>>;
  activeHighlightCategory: string | null;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  expandedStep,
  setExpandedStep,
  selectedFields,
  toggleField,
  showClues,
  setShowClues,
  activeHighlightCategory,
}) => {
  return (
    <div className={styles.journeyPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Journey Timeline</h2>
        <button
          className={`${styles.hintButton} ${showClues ? styles.hintActive : ''}`}
          onClick={() => setShowClues((prev) => !prev)}
          title='Show Clue Hints'
        >
          ❓
        </button>
      </div>
      <div className={styles.timeline}>
        {Object.keys(JOURNEY_FIELDS).map((stepIdStr) => {
          const stepId = Number(stepIdStr) as JourneyEvent;
          const fields = JOURNEY_FIELDS[stepId];
          const isExpanded = expandedStep === stepId;
          const stepColor = STEP_COLORS[stepId];
          const isErrorStep = stepId === JourneyEvent.TOKEN_GRANT;
          const hasClue = fields.some((f) => f.isClue);

          // Count selected fields for this step
          const selectedCount = fields.filter(
            (f) => selectedFields[`${stepId}-${f.name}`],
          ).length;

          return (
            <div key={stepId} className={styles.timelineStep}>
              <button
                className={`${styles.stepHeader} ${isExpanded ? styles.expanded : ''}`}
                onClick={() => setExpandedStep(isExpanded ? null : stepId)}
                style={{ '--step-color': stepColor } as React.CSSProperties}
              >
                <span className={styles.stepDot} />
                <span className={styles.stepName}>
                  {stepId + 1}. {EVENT_NAMES[stepId].toUpperCase()}
                  {isErrorStep && <span className={styles.errorBadge}>⚠️</span>}
                  {hasClue && !isErrorStep && showClues && (
                    <span className={styles.clueBadge}>🔑</span>
                  )}
                </span>
                <span className={styles.stepCount}>
                  {selectedCount > 0 && `${selectedCount}/${fields.length}`}
                </span>
                <span className={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className={styles.stepFields}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {fields.map((field) => {
                      const key = `${stepId}-${field.name}`;
                      const isSelected = selectedFields[key];
                      const isClueHighlighted = showClues && field.isClue;
                      const isCategoryHighlighted =
                        activeHighlightCategory === field.gapCategory;

                      return (
                        <label
                          key={field.name}
                          className={`
                                ${styles.fieldLabel} 
                                ${field.isClue && showClues ? styles.clueField : ''}
                                ${isClueHighlighted ? styles.fieldHintClue : ''}
                                ${isCategoryHighlighted ? styles.fieldHintCategory : ''}
                              `}
                          style={
                            isCategoryHighlighted
                              ? ({
                                  '--category-color': STEP_COLORS[stepId],
                                } as React.CSSProperties)
                              : {}
                          }
                        >
                          <div className={styles.checkboxWrapper}>
                            <input
                              type='checkbox'
                              checked={isSelected || false}
                              onChange={() => toggleField(stepId, field.name)}
                              className={styles.checkbox}
                            />
                          </div>
                          <span className={styles.fieldName}>{field.name}</span>
                          {field.isClue && showClues && (
                            <span className={styles.clueIndicator}>🔑</span>
                          )}
                        </label>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
