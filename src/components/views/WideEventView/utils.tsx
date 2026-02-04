import React from 'react';
import styles from './JsonPreviewPanel.module.css';
import { JourneyEvent, EVENT_NAMES } from '../../../core/types/domain';
import { JOURNEY_FIELDS } from './data';

// Helper to render colorized JSON
export function renderColorizedJson(
  obj: Record<string, unknown>,
): React.ReactNode {
  const lines: React.ReactNode[] = [];
  let lineNum = 0;

  const addLine = (content: React.ReactNode, indent: number = 0) => {
    const indentClass =
      indent === 1
        ? styles.jsonLineIndent1
        : indent === 2
          ? styles.jsonLineIndent2
          : '';
    lines.push(
      <div key={lineNum++} className={`${styles.jsonLine} ${indentClass}`}>
        {content}
      </div>,
    );
  };

  addLine(<span className={styles.jsonColorWhite}>{'{'}</span>);

  // Base fields
  const baseFields = [
    'timestamp',
    'trace_id',
    'severity',
    'event',
    'message',
    'error_code',
    'node',
  ];
  baseFields.forEach((key, idx) => {
    const val = obj[key];
    const comma =
      idx < baseFields.length - 1 || Object.keys(obj).length > baseFields.length
        ? ','
        : '';
    addLine(
      <>
        <span className={styles.jsonColorKey}>&quot;{key}&quot;</span>
        <span className={styles.jsonColorWhite}>: </span>
        <span
          className={
            key === 'severity' ? styles.jsonColorError : styles.jsonColorString
          }
        >
          &quot;{String(val)}&quot;
        </span>
        <span className={styles.jsonColorWhite}>{comma}</span>
      </>,
      1,
    );
  });

  // Enriched fields by step
  const enrichedKeys = Object.keys(obj).filter((k) => !baseFields.includes(k));
  enrichedKeys.forEach((stepName, stepIdx) => {
    const stepData = obj[stepName] as Record<string, unknown>;
    const stepId = Object.entries(EVENT_NAMES).find(
      ([, name]) => name === stepName,
    )?.[0];

    addLine(
      <>
        <span className={`${styles.jsonColorStepName} step-color-${stepId}`}>
          &quot;{stepName}&quot;
        </span>
        <span className={styles.jsonColorWhite}>: {'{'}</span>
      </>,
      1,
    );

    const fieldKeys = Object.keys(stepData);
    fieldKeys.forEach((fieldKey, fieldIdx) => {
      const val = stepData[fieldKey];
      const comma = fieldIdx < fieldKeys.length - 1 ? ',' : '';

      // Look up isClue using JOURNEY_FIELDS
      // Note: stepId is a string Key from EVENT_NAMES.
      const journeyEventId = Number(stepId) as JourneyEvent;
      const fieldsForEvent = JOURNEY_FIELDS[journeyEventId];
      const isClue = fieldsForEvent?.find((f) => f.name === fieldKey)?.isClue;

      addLine(
        <>
          <span className={isClue ? styles.jsonColorClue : styles.jsonColorKey}>
            &quot;{fieldKey}&quot;
          </span>
          <span className={styles.jsonColorWhite}>: </span>
          <span
            className={
              typeof val === 'string'
                ? styles.jsonColorString
                : styles.jsonColorNumber
            }
          >
            {typeof val === 'string' ? `"${val}"` : String(val)}
          </span>
          <span className={styles.jsonColorWhite}>{comma}</span>
          {isClue && <span className={styles.jsonClueAnnotation}>← CLUE!</span>}
        </>,
        2,
      );
    });

    const endComma = stepIdx < enrichedKeys.length - 1 ? ',' : '';
    addLine(<span className={styles.jsonColorWhite}>{`}${endComma}`}</span>, 1);
  });

  addLine(<span className={styles.jsonColorWhite}>{'}'}</span>);

  return lines;
}
