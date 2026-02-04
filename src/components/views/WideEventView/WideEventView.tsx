'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { JourneyEvent, EVENT_NAMES } from '../../../core/types/domain';
import styles from './WideEventView.module.css';
import { JourneyTimeline } from './JourneyTimeline';
import { JsonPreviewPanel } from './JsonPreviewPanel';
import { InvestigationProgress } from './InvestigationProgress';
import { EvidenceBoard } from './EvidenceBoard';
import { JOURNEY_FIELDS } from './data';
import { CLUES, getClueForField, ClueDef } from './clues';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const SPAN_IDS: Record<number, string> = {
  [JourneyEvent.CONNECT]: 'sp-bf41',
  [JourneyEvent.TLS_HANDSHAKE]: 'sp-71e2',
  [JourneyEvent.WAF_CHECK]: 'sp-a92c',
  [JourneyEvent.GEO_CHECK]: 'sp-3f01',
  [JourneyEvent.BOT_CHECK_START]: 'sp-d82b',
  [JourneyEvent.JS_CHALLENGE]: 'sp-1c5f',
  [JourneyEvent.CAPTCHA_PRESENTED]: 'sp-6a0e',
  [JourneyEvent.CAPTCHA_SOLVED]: 'sp-2b9d',
  [JourneyEvent.INTEGRITY_PASSED]: 'sp-f483',
  [JourneyEvent.QUEUE_ENTER]: 'sp-0e1a',
  [JourneyEvent.QUEUE_POLL_1]: 'sp-9c3b',
  [JourneyEvent.QUEUE_POLL_2]: 'sp-5d71',
  [JourneyEvent.QUEUE_NEXT]: 'sp-8b4e',
  [JourneyEvent.TOKEN_GRANT]: 'sp-e2f7',
  [JourneyEvent.ADMITTED]: 'sp-13ac',
};

export const WideEventView: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<JourneyEvent | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [showClues, setShowClues] = useState(false);
  const [activeHighlightCategory, setActiveHighlightCategory] = useState<
    string | null
  >(null);
  const [showProblemTooltip, setShowProblemTooltip] = useState(false);
  const [foundClues, setFoundClues] = useState<Record<string, boolean>>({});
  const [clueOrder, setClueOrder] = useState<ClueDef[]>([]);
  const [usedBulkSelect, setUsedBulkSelect] = useState(false);

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
    setUsedBulkSelect(true);
    setFoundClues(
      CLUES.reduce<Record<string, boolean>>((acc, clue) => {
        acc[clue.id] = true;
        return acc;
      }, {}),
    );
    setClueOrder(CLUES);
  };

  const onFieldInspected = (stepId: JourneyEvent, fieldName: string) => {
    const clue = getClueForField(stepId, fieldName);
    if (!clue || foundClues[clue.id]) return;
    setFoundClues((prev) => ({ ...prev, [clue.id]: true }));
    setClueOrder((prev) => [...prev, clue]);
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

    Object.entries(JOURNEY_FIELDS).forEach(([stepIdStr, fields]) => {
      const stepId = Number(stepIdStr) as JourneyEvent;
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

  const cluesFound = clueOrder.length;
  const totalClues = CLUES.length;
  const allFound = cluesFound === totalClues;
  const rootCauseUnlocked = allFound;

  // Build the JSON preview object
  const jsonPreview = useMemo(() => {
    const base: Record<string, unknown> = {
      timestamp: '2026-01-26T00:02:12.456Z',
      trace_id: 'tr-7f8a3c2b1d0e9f',
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

      const isStepSelected = Object.keys(stepFields).length > 0;
      const isStepExpanded = expandedStep === stepId;

      if (isStepSelected || isStepExpanded) {
        enriched[EVENT_NAMES[stepId]] = {
          span_id: SPAN_IDS[stepId],
          ...stepFields,
        };
      }
    });

    return { ...base, ...enriched };
  }, [selectedFields, expandedStep]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleText}>
            <h1>Wide Event Builder</h1>
            <p className={styles.subtitle}>
              Connect the clues to reveal the full story
            </p>
          </div>
        </div>

        <div className={styles.statsWrapper}>
          <InvestigationProgress
            cluesFound={cluesFound}
            totalClues={totalClues}
            rootCauseUnlocked={rootCauseUnlocked && !usedBulkSelect}
            selectAll={selectAll}
            gapCoverage={gapCoverage}
            activeHighlightCategory={activeHighlightCategory}
            setActiveHighlightCategory={setActiveHighlightCategory}
          />
        </div>
      </div>

      <div className={styles.mainContentThreeCol}>
        <div className={styles.contentColumn}>
          <JourneyTimeline
            expandedStep={expandedStep}
            setExpandedStep={setExpandedStep}
            selectedFields={selectedFields}
            toggleField={toggleField}
            showClues={showClues}
            setShowClues={setShowClues}
            activeHighlightCategory={activeHighlightCategory}
            onFieldInspected={onFieldInspected}
            foundClues={foundClues}
          />
        </div>

        <div className={styles.contentColumn}>
          <EvidenceBoard
            foundClues={clueOrder}
            totalClues={CLUES.length}
            allFound={allFound}
            usedBulkSelect={usedBulkSelect}
          />
        </div>

        <div className={styles.contentColumn}>
          <JsonPreviewPanel
            jsonPreview={jsonPreview}
            showProblemTooltip={showProblemTooltip}
            setShowProblemTooltip={setShowProblemTooltip}
            highlightTags={clueOrder.map((clue) => clue.evidenceTag)}
          />
        </div>
      </div>
    </div>
  );
};
