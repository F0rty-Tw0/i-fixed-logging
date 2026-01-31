'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLogQuery } from '../../../core/hooks/useLogQuery';
import { Lexer } from '../../../core/query/lexer';
import { Parser } from '../../../core/query/parser';
import styles from './StructuredLogsView.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

import { PREDEFINED_FILTERS } from '../../../core/constants';

export const StructuredLogsView: React.FC = () => {
  const [sql, setSql] = useState(PREDEFINED_FILTERS[0].sql);
  const [isValid, setIsValid] = useState(true);
  const { results, columns, loading, error, runQuery } = useLogQuery();
  const parentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 31,
    overscan: 10,
  });

  const validateSql = useCallback((input: string) => {
    try {
      if (!input.trim()) return false;
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    setIsValid(validateSql(sql));
  }, [sql, validateSql]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (isValid) runQuery(sql);
    }
  };

  // Initial query
  useEffect(() => {
    runQuery(PREDEFINED_FILTERS[0].sql);
  }, [runQuery]);

  const renderCell = (row: Record<string, unknown>, col: string) => {
    const val = row[col];
    if (val === null || val === undefined)
      return <span style={{ opacity: 0.3 }}>null</span>;

    const colLower = col.toLowerCase();

    if (colLower === 'journey_id') {
      return (
        <a
          href={`/distributed-tracing?traceId=${val}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {String(val)}
        </a>
      );
    }

    if (colLower === 'severity') {
      const sevStr = String(val).toUpperCase();
      return (
        <span className={styles[`severity_${sevStr}`] || ''}>{sevStr}</span>
      );
    }

    if (colLower === 'timestamp' && typeof val === 'number') {
      return (
        <span className={styles.timestampCell}>
          {new Date(val).toLocaleTimeString()}
        </span>
      );
    }

    if (
      typeof val === 'number' &&
      (colLower.includes('latency') || col.toUpperCase().includes('AVG'))
    ) {
      return <span className={styles.latencyCell}>{val.toFixed(2)}ms</span>;
    }

    if (typeof val === 'number') {
      return val.toLocaleString();
    }

    return String(val);
  };

  const getHighlightedSql = (input: string) => {
    try {
      // Escape for display
      const escaped = input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      // Highlight logic applied to escaped string
      // Keywords (\b won't work on escaped chars, but keywords don't have symbols)
      const keywords =
        /\b(SELECT|FROM|WHERE|GROUP|ORDER|BY|LIMIT|AND|OR|NOT|IN|LIKE|ASC|DESC|AVG|COUNT|SUM)\b/gi;
      const strings = /('.*?')/g; // Match regular quotes
      const numbers = /\b\d+(\.\d+)?\b/g;

      let html = escaped;

      // Use placeholders to avoid double-wrapping
      const parts: { key: string; val: string }[] = [];
      let i = 0;

      html = html.replace(strings, (m) => {
        const key = `__STR${i++}__`;
        parts.push({
          key,
          val: `<span class="${styles.word_string}">${m}</span>`,
        });
        return key;
      });

      html = html.replace(keywords, (m) => {
        const key = `__KEY${i++}__`;
        parts.push({
          key,
          val: `<span class="${styles.word_keyword}">${m}</span>`,
        });
        return key;
      });

      html = html.replace(numbers, (m) => {
        const key = `__NUM${i++}__`;
        parts.push({
          key,
          val: `<span class="${styles.word_number}">${m}</span>`,
        });
        return key;
      });

      // Restore
      parts.forEach((p) => {
        html = html.replace(p.key, p.val);
      });

      return html;
    } catch {
      return input;
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={styles.header}>
        <motion.div
          className={styles.titleSection}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1>Advanced Query Engine</h1>
        </motion.div>

        <motion.div
          className={clsx(
            styles.queryEditor,
            isValid ? styles.valid : styles.invalid,
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className={clsx(
              styles.validationBadge,
              isValid ? styles.badge_valid : styles.badge_invalid,
            )}
          >
            {isValid ? 'Ready to run' : 'Syntax Error'}
          </div>

          <div className={styles.inputWrapper}>
            <div className={styles.editorContainer}>
              <textarea
                ref={textareaRef}
                className={styles.queryInput}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='SELECT * FROM logs WHERE...'
                spellCheck={false}
                rows={1}
              />
              <div
                className={styles.highlightOverlay}
                dangerouslySetInnerHTML={{
                  __html: getHighlightedSql(sql) + '\n',
                }}
              />
            </div>

            <button
              className={styles.runButton}
              onClick={() => runQuery(sql)}
              disabled={loading || !isValid}
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polygon points='5 3 19 12 5 21 5 3'></polygon>
              </svg>
              Run Query
            </button>
          </div>
          {loading && <div className={styles.loader} />}
        </motion.div>

        <motion.div
          className={styles.chipsContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {PREDEFINED_FILTERS.map((filter) => (
            <motion.button
              key={filter.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={styles.chip}
              onClick={() => {
                setSql(filter.sql);
                runQuery(filter.sql);
              }}
            >
              {filter.label}
            </motion.button>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.errorBanner}
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <circle cx='12' cy='12' r='10'></circle>
              <line x1='12' y1='8' x2='12' y2='12'></line>
              <line x1='12' y1='16' x2='12.01' y2='16'></line>
            </svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={styles.resultsContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {results.length > 0 ? (
          <div className={styles.tableWrapper} ref={parentRef}>
            <div
              className={styles.headerRow}
              style={{
                gridTemplateColumns: `repeat(${columns.length || 1}, minmax(120px, 300px))`,
              }}
            >
              {columns.map((col) => (
                <div key={col} className={styles.headerCell} title={col}>
                  {col.replace(/_/g, ' ').toUpperCase()}
                </div>
              ))}
            </div>

            <div
              className={styles.tableBody}
              style={{
                height: `${virtualizer.getTotalSize()}px`,
              }}
            >
              {virtualizer.getVirtualItems().map((vRow) => {
                const row = results[vRow.index];
                if (!row) return null;

                return (
                  <div
                    key={vRow.key}
                    className={styles.row}
                    style={{
                      top: 0,
                      left: 0,
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                      gridTemplateColumns: `repeat(${columns.length || 1}, minmax(120px, 300px))`,
                    }}
                  >
                    {columns.map((col) => (
                      <div
                        key={col}
                        className={styles.cell}
                        title={String(row[col] || '')}
                      >
                        {renderCell(row, col)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !loading && (
            <div className={styles.emptyState}>
              <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='1.5'
                  d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                ></path>
              </svg>
              <p>
                {sql
                  ? 'No results found for this query'
                  : 'Enter a SQL query to begin analysis'}
              </p>
            </div>
          )
        )}
      </motion.div>
    </motion.div>
  );
};
