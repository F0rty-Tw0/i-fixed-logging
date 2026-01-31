import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
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
            <circle cx='12' cy='12' r='10'></circle>
            <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'></path>
            <line x1='12' y1='17' x2='12.01' y2='17'></line>
          </svg>
        </button>
      </div>
      <div className={styles.timeline}>
        {Object.keys(JOURNEY_FIELDS).map((stepIdStr, index) => {
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
            <motion.div
              key={stepId}
              className={styles.timelineStep}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <button
                className={`${styles.stepHeader} ${isExpanded ? styles.expanded : ''}`}
                onClick={() => setExpandedStep(isExpanded ? null : stepId)}
                style={{ '--step-color': stepColor } as React.CSSProperties}
              >
                <span className={styles.stepDot} />
                <span className={styles.stepName}>
                  {EVENT_NAMES[stepId].toUpperCase()}
                  {isErrorStep && (
                    <span className={styles.errorBadge}>
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
                        <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'></path>
                        <line x1='12' y1='9' x2='12' y2='13'></line>
                        <line x1='12' y1='17' x2='12.01' y2='17'></line>
                      </svg>
                    </span>
                  )}
                  {hasClue && !isErrorStep && showClues && (
                    <span className={styles.clueBadge}>
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <path d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3L15.5 7.5z'></path>
                      </svg>
                    </span>
                  )}
                </span>
                <span className={styles.stepCount}>
                  {selectedCount > 0 ? `${selectedCount}/${fields.length}` : ''}
                </span>
                <span className={styles.chevron}>
                  <svg
                    width='10'
                    height='10'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                  >
                    <polyline points='9 18 15 12 9 6'></polyline>
                  </svg>
                </span>
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
                          className={clsx(
                            styles.fieldLabel,
                            field.isClue && showClues && styles.clueField,
                            isClueHighlighted && styles.fieldHintClue,
                            isCategoryHighlighted && styles.fieldHintCategory,
                          )}
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
                            <span className={styles.clueIndicator}>
                              <svg
                                width='10'
                                height='10'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                              >
                                <path d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3L15.5 7.5z'></path>
                              </svg>
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
