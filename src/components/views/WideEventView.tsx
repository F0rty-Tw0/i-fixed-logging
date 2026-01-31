'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { JourneyEvent, EVENT_NAMES } from '../../core/types/domain';
import styles from './WideEventView.module.css';
import { JourneyTimeline } from './WideEventView/JourneyTimeline';
import { JsonPreviewPanel } from './WideEventView/JsonPreviewPanel';
import { InvestigationProgress } from './WideEventView/InvestigationProgress';
import { JOURNEY_FIELDS } from './WideEventView/data';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const WideEventView: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<JourneyEvent | null>(
    JourneyEvent.CONNECT,
  );
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [showClues, setShowClues] = useState(false);
  const [activeHighlightCategory, setActiveHighlightCategory] = useState<
    string | null
  >(null);
  const [showProblemTooltip, setShowProblemTooltip] = useState(false);

  // Auto-dismiss tooltip after 5s
  useEffect(() => {
    if (showProblemTooltip) {
      const timer = setTimeout(() => setShowProblemTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showProblemTooltip]);

  // Toggle a field selection
  const toggleField = (stepId: JourneyEvent, fieldName: string) => {
    const key = `${stepId}-${fieldName}`;
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Select all fields
  const selectAll = () => {
    const allFields: Record<string, boolean> = {};
    Object.entries(JOURNEY_FIELDS).forEach(([stepId, fields]) => {
      fields.forEach((field) => {
        allFields[`${stepId}-${field.name}`] = true;
      });
    });
    setSelectedFields(allFields);
  };

  // Calculate gap coverage
  const gapCoverage = useMemo(() => {
    const coverage: Record<
      string,
      { selected: number; total: number; hasClue: boolean }
    > = {
      trace: { selected: 0, total: 0, hasClue: false },
      customer: { selected: 0, total: 0, hasClue: false },
      security: { selected: 0, total: 0, hasClue: false },
      timing: { selected: 0, total: 0, hasClue: false },
      infra: { selected: 0, total: 0, hasClue: false },
    };

    Object.entries(JOURNEY_FIELDS).forEach(([stepId, fields]) => {
      fields.forEach((field) => {
        const key = `${stepId}-${field.name}`;
        coverage[field.gapCategory].total++;
        if (selectedFields[key]) {
          coverage[field.gapCategory].selected++;
          if (field.isClue) {
            coverage[field.gapCategory].hasClue = true;
          }
        }
      });
    });

    return coverage;
  }, [selectedFields]);

  // Count clues found
  const cluesFound = useMemo(() => {
    let count = 0;
    Object.entries(JOURNEY_FIELDS).forEach(([stepId, fields]) => {
      fields.forEach((field) => {
        if (field.isClue && selectedFields[`${stepId}-${field.name}`]) {
          count++;
        }
      });
    });
    return count;
  }, [selectedFields]);

  const totalClues = useMemo(() => {
    let count = 0;
    Object.values(JOURNEY_FIELDS).forEach((fields) => {
      fields.forEach((field) => {
        if (field.isClue) count++;
      });
    });
    return count;
  }, []);

  const rootCauseUnlocked = cluesFound >= totalClues;

  // Build the JSON preview object
  const jsonPreview = useMemo(() => {
    const base: Record<string, unknown> = {
      timestamp: '2026-01-26T00:02:12.456Z',
      severity: 'ERROR',
      event: 'token_grant',
      message: 'Token signing failed: EC_KEY_DERIVE_ERROR',
      error_code: 'ERR-1234',
      node: 'token-service',
    };

    const enriched: Record<string, Record<string, unknown>> = {};

    Object.entries(JOURNEY_FIELDS).forEach(([stepIdStr, fields]) => {
      const stepId = Number(stepIdStr) as JourneyEvent;
      const stepFields: Record<string, unknown> = {};

      fields.forEach((field) => {
        const key = `${stepId}-${field.name}`;
        if (selectedFields[key]) {
          stepFields[field.name] = field.value;
        }
      });

      if (Object.keys(stepFields).length > 0) {
        enriched[EVENT_NAMES[stepId]] = stepFields;
      }
    });

    return { ...base, ...enriched };
  }, [selectedFields]);

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={styles.header}>
        <motion.div
          className={styles.headerLeft}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className={styles.title}>
            <span className={styles.icon}>🔍</span>
            Wide Event Builder
          </h1>
          <p className={styles.subtitle}>
            Connect the clues to reveal the full story
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <InvestigationProgress
            cluesFound={cluesFound}
            totalClues={totalClues}
            rootCauseUnlocked={rootCauseUnlocked}
            selectAll={selectAll}
            gapCoverage={gapCoverage}
            activeHighlightCategory={activeHighlightCategory}
            setActiveHighlightCategory={setActiveHighlightCategory}
          />
        </motion.div>
      </div>

      <div className={styles.mainContent}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', minHeight: 0 }}
        >
          <JourneyTimeline
            expandedStep={expandedStep}
            setExpandedStep={setExpandedStep}
            selectedFields={selectedFields}
            toggleField={toggleField}
            showClues={showClues}
            setShowClues={setShowClues}
            activeHighlightCategory={activeHighlightCategory}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', minHeight: 0 }}
        >
          <JsonPreviewPanel
            jsonPreview={jsonPreview}
            showProblemTooltip={showProblemTooltip}
            setShowProblemTooltip={setShowProblemTooltip}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
