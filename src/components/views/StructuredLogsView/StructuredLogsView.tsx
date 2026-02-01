'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLogQuery } from '../../../core/hooks/useLogQuery';
import { Lexer } from '../../../core/query/lexer';
import { Parser } from '../../../core/query/parser';
import styles from './StructuredLogsView.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { VirtualLogRow } from '../../VirtualLogList/VirtualLogRow';
import {
  PREDEFINED_FILTERS,
  LOG_COLUMN_METADATA,
} from '../../../core/constants/ui';

export const StructuredLogsView: React.FC = () => {
  const [sql, setSql] = useState(PREDEFINED_FILTERS[0].sql);
  const [isValid, setIsValid] = useState(true);
  const { results, columns, loading, error, runQuery } = useLogQuery();
  const parentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // Matching VirtualLogList
    overscan: 10,
    getItemKey: (index) => index,
  });

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

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

  const getColumnWidth = (col: string): string => {
    const colLower = col.toLowerCase();
    const meta = LOG_COLUMN_METADATA[colLower];
    if (meta) return meta.width;

    if (
      colLower.includes('latency') ||
      colLower.includes('p99') ||
      colLower.includes('avg')
    )
      return '90px';
    return '120px';
  };

  const getColumnLabel = (col: string): string => {
    const colLower = col.toLowerCase();
    const meta = LOG_COLUMN_METADATA[colLower];
    if (meta) return meta.label;

    return col.replace(/_/g, ' ').toUpperCase();
  };

  const getHighlightedSql = (input: string) => {
    try {
      // Escape for display
      const escaped = input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      // Categorized Keywords
      const categories = [
        {
          // High-level commands
          regex:
            /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|UNION|ALL|INSERT|INTO|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\b/gi,
          className: styles.word_command,
        },
        {
          // Logical operators
          regex:
            /\b(AND|OR|NOT|IN|LIKE|IS|NULL|BETWEEN|EXISTS|ANY|ALL|SOME)\b/gi,
          className: styles.word_logical,
        },
        {
          // Functions
          regex:
            /\b(AVG|COUNT|SUM|MIN|MAX|ROUND|COALESCE|IFNULL|CONCAT|SUBSTR|SUBSTRING|LENGTH|UPPER|LOWER|NOW|TRIM)\b/gi,
          className: styles.word_function,
        },
        {
          // Control / Sorting / Constraints
          regex:
            /\b(GROUP|ORDER|BY|LIMIT|OFFSET|HAVING|ASC|DESC|DISTINCT|AS|ON|SET|VALUES)\b/gi,
          className: styles.word_control,
        },
      ];

      const strings = /('.*?')/g;
      const numbers = /\b\d+(\.\d+)?\b/g;

      let html = escaped;
      const parts: { key: string; val: string }[] = [];
      let i = 0;

      // 1. Handle Strings first (to avoid internal keyword matches)
      html = html.replace(strings, (m) => {
        const key = `__STR${i++}__`;
        parts.push({
          key,
          val: `<span class="${styles.word_string}">${m}</span>`,
        });
        return key;
      });

      // 2. Handle Categorized Keywords
      categories.forEach((cat) => {
        html = html.replace(cat.regex, (m) => {
          const key = `__CAT${i++}__`;
          parts.push({
            key,
            val: `<span class="${cat.className}">${m}</span>`,
          });
          return key;
        });
      });

      // 3. Handle Numbers
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

  const gridTemplateColumns = columns
    .map((col) => getColumnWidth(col))
    .join(' ');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div
          className={clsx(
            styles.queryEditor,
            isValid ? styles.valid : styles.invalid,
          )}
        >
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Advanced Query Engine</h1>
            <div
              className={clsx(
                styles.validationBadge,
                isValid ? styles.badge_valid : styles.badge_invalid,
              )}
            >
              {isValid ? 'Ready' : 'Error'}
            </div>
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
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polygon points='5 3 19 12 5 21 5 3'></polygon>
              </svg>
              Run
            </button>
          </div>
          {loading && <div className={styles.loader} />}
        </div>

        <div className={styles.chipsContainer}>
          {PREDEFINED_FILTERS.map((filter) => (
            <button
              key={filter.label}
              className={clsx(
                styles.chip,
                sql === filter.sql && styles.activeChip,
              )}
              onClick={() => {
                setSql(filter.sql);
                runQuery(filter.sql);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
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

      <div className={styles.resultsContainer}>
        {results.length > 0 ? (
          <div className={styles.tableWrapper} ref={parentRef}>
            <div
              className={styles.headerRow}
              style={{
                gridTemplateColumns: gridTemplateColumns,
              }}
            >
              {columns.map((col) => (
                <div key={col} className={styles.headerCell} title={col}>
                  {getColumnLabel(col)}
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
                const isExpanded = expandedIndex === vRow.index;

                return (
                  <VirtualLogRow
                    key={vRow.key}
                    virtualItem={vRow}
                    absIndex={vRow.index}
                    isExpanded={isExpanded}
                    toggleExpand={toggleExpand}
                    gridTemplateColumns={gridTemplateColumns}
                    columns={columns}
                    getItem={(col) => row[col]}
                    getRowData={() => row}
                    measureElement={
                      isExpanded ? virtualizer.measureElement : undefined
                    }
                  />
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
      </div>
    </div>
  );
};
