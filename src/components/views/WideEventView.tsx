/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JourneyEvent, EVENT_NAMES } from '../../core/types/domain';
import styles from './WideEventView.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// FIELD DEFINITIONS (10+ per step)
// ─────────────────────────────────────────────────────────────────────────────

interface FieldDef {
  name: string;
  value: string | number | boolean;
  isClue?: boolean; // Fields that reveal the root cause
  gapCategory: 'trace' | 'customer' | 'security' | 'timing' | 'infra';
}

const JOURNEY_FIELDS: Record<JourneyEvent, FieldDef[]> = {
  [JourneyEvent.CONNECT]: [
    { name: 'client_ip', value: '203.45.67.89', gapCategory: 'security' },
    { name: 'source_port', value: 54321, gapCategory: 'infra' },
    { name: 'destination_ip', value: '10.0.1.42', gapCategory: 'infra' },
    { name: 'connection_id', value: 'conn-8f4a2b1c', gapCategory: 'trace' },
    { name: 'protocol', value: 'HTTP/1.1', gapCategory: 'infra' },
    { name: 'keep_alive', value: true, gapCategory: 'infra' },
    { name: 'tcp_flags', value: 'SYN,ACK', gapCategory: 'infra' },
    { name: 'mtu_size', value: 1500, gapCategory: 'infra' },
    { name: 'socket_buffer', value: 65536, gapCategory: 'infra' },
    { name: 'proxy_protocol', value: 'v2', gapCategory: 'infra' },
  ],
  [JourneyEvent.TLS_HANDSHAKE]: [
    {
      name: 'tls_version',
      value: 'TLS 1.0',
      isClue: true,
      gapCategory: 'security',
    },
    { name: 'cipher', value: 'RC4-SHA', isClue: true, gapCategory: 'security' },
    { name: 'sni_hostname', value: 'shop.example.com', gapCategory: 'infra' },
    { name: 'client_hello_size', value: 512, gapCategory: 'timing' },
    { name: 'handshake_duration_ms', value: 245, gapCategory: 'timing' },
    { name: 'cert_chain_length', value: 3, gapCategory: 'security' },
    { name: 'ocsp_status', value: 'good', gapCategory: 'security' },
    { name: 'alpn_protocol', value: 'h2', gapCategory: 'infra' },
    { name: 'session_resumed', value: false, gapCategory: 'timing' },
    { name: 'early_data', value: false, gapCategory: 'timing' },
  ],
  [JourneyEvent.WAF_CHECK]: [
    { name: 'rules_checked', value: 147, gapCategory: 'security' },
    { name: 'waf_score', value: 35, gapCategory: 'security' },
    { name: 'waf_action', value: 'allow', gapCategory: 'security' },
    { name: 'risk_level', value: 'medium', gapCategory: 'security' },
    {
      name: 'matched_rules',
      value: 'sqli-001,xss-003',
      gapCategory: 'security',
    },
    { name: 'payload_size', value: 2048, gapCategory: 'infra' },
    { name: 'request_method', value: 'POST', gapCategory: 'trace' },
    { name: 'uri_path', value: '/api/checkout', gapCategory: 'trace' },
    { name: 'query_params', value: 'ref=home', gapCategory: 'trace' },
    { name: 'content_type', value: 'application/json', gapCategory: 'infra' },
  ],
  [JourneyEvent.GEO_CHECK]: [
    { name: 'country', value: 'IR', isClue: true, gapCategory: 'security' },
    { name: 'region', value: 'Tehran', gapCategory: 'security' },
    { name: 'city', value: 'Tehran', gapCategory: 'security' },
    { name: 'asn', value: 44889, gapCategory: 'security' },
    { name: 'asn_org', value: 'TIC', gapCategory: 'security' },
    { name: 'is_vpn', value: false, gapCategory: 'security' },
    { name: 'is_proxy', value: false, gapCategory: 'security' },
    { name: 'is_tor', value: false, gapCategory: 'security' },
    { name: 'is_datacenter', value: false, gapCategory: 'security' },
    {
      name: 'is_sanctioned',
      value: true,
      isClue: true,
      gapCategory: 'security',
    },
  ],
  [JourneyEvent.BOT_CHECK_START]: [
    { name: 'bot_score', value: 0.89, isClue: true, gapCategory: 'security' },
    { name: 'headless', value: false, gapCategory: 'security' },
    { name: 'webdriver', value: false, gapCategory: 'security' },
    { name: 'plugins_count', value: 3, gapCategory: 'security' },
    { name: 'screen_res', value: '1920x1080', gapCategory: 'security' },
    { name: 'timezone', value: 'Asia/Tehran', gapCategory: 'customer' },
    { name: 'language', value: 'fa-IR', gapCategory: 'customer' },
    { name: 'canvas_hash', value: 'a1b2c3d4', gapCategory: 'security' },
    { name: 'webgl_hash', value: 'e5f6g7h8', gapCategory: 'security' },
    { name: 'audio_hash', value: 'i9j0k1l2', gapCategory: 'security' },
  ],
  [JourneyEvent.JS_CHALLENGE]: [
    { name: 'challenge_id', value: 'ch-9f8e7d6c', gapCategory: 'trace' },
    { name: 'challenge_type', value: 'proof-of-work', gapCategory: 'security' },
    {
      name: 'challenge_start',
      value: '2026-01-26T00:01:55.000Z',
      gapCategory: 'timing',
    },
    {
      name: 'challenge_end',
      value: '2026-01-26T00:01:57.234Z',
      gapCategory: 'timing',
    },
    { name: 'solve_duration_ms', value: 2234, gapCategory: 'timing' },
    { name: 'js_environment', value: 'browser', gapCategory: 'security' },
    { name: 'worker_support', value: true, gapCategory: 'security' },
    { name: 'wasm_support', value: true, gapCategory: 'security' },
    { name: 'memory_available', value: 8192, gapCategory: 'infra' },
    { name: 'cpu_cores', value: 8, gapCategory: 'infra' },
  ],
  [JourneyEvent.CAPTCHA_PRESENTED]: [
    { name: 'captcha_type', value: 'image-select', gapCategory: 'security' },
    { name: 'captcha_provider', value: 'internal', gapCategory: 'infra' },
    { name: 'difficulty_level', value: 'medium', gapCategory: 'security' },
    { name: 'image_count', value: 9, gapCategory: 'security' },
    { name: 'audio_available', value: true, gapCategory: 'customer' },
    { name: 'load_time_ms', value: 156, gapCategory: 'timing' },
    { name: 'render_time_ms', value: 42, gapCategory: 'timing' },
    { name: 'session_token', value: 'cap-abc123', gapCategory: 'trace' },
    { name: 'fallback_used', value: false, gapCategory: 'infra' },
    { name: 'accessibility_mode', value: false, gapCategory: 'customer' },
  ],
  [JourneyEvent.CAPTCHA_SOLVED]: [
    { name: 'solve_time_ms', value: 8456, gapCategory: 'timing' },
    { name: 'attempts', value: 1, gapCategory: 'customer' },
    { name: 'correct_answers', value: 3, gapCategory: 'security' },
    { name: 'timeout_occurred', value: false, gapCategory: 'timing' },
    { name: 'client_drift_ms', value: 12, gapCategory: 'timing' },
    { name: 'interaction_events', value: 47, gapCategory: 'customer' },
    { name: 'mouse_movements', value: 234, gapCategory: 'security' },
    { name: 'keypress_count', value: 0, gapCategory: 'security' },
    { name: 'tab_switches', value: 0, gapCategory: 'security' },
    { name: 'paste_detected', value: false, gapCategory: 'security' },
  ],
  [JourneyEvent.INTEGRITY_PASSED]: [
    { name: 'integrity_score', value: 72, gapCategory: 'security' },
    { name: 'device_fingerprint', value: 'fp-xyz789', gapCategory: 'security' },
    { name: 'device_age_days', value: 0, gapCategory: 'customer' },
    { name: 'known_device', value: false, gapCategory: 'customer' },
    {
      name: 'risk_signals',
      value: 'new_device,foreign_ip',
      gapCategory: 'security',
    },
    { name: 'behavioral_score', value: 65, gapCategory: 'security' },
    { name: 'velocity_check', value: 'pass', gapCategory: 'security' },
    { name: 'linked_accounts', value: 0, gapCategory: 'customer' },
    { name: 'trust_level', value: 'low', gapCategory: 'security' },
    { name: 'fraud_flags', value: 'none', gapCategory: 'security' },
  ],
  [JourneyEvent.QUEUE_ENTER]: [
    { name: 'queue_id', value: 'q-standard-01', gapCategory: 'infra' },
    { name: 'queue_name', value: 'Standard Queue', gapCategory: 'infra' },
    { name: 'initial_position', value: 4521, gapCategory: 'customer' },
    { name: 'est_wait_seconds', value: 180, gapCategory: 'timing' },
    { name: 'queue_length', value: 12000, gapCategory: 'infra' },
    { name: 'priority_boost', value: 0, gapCategory: 'customer' },
    { name: 'segment_multiplier', value: 1.0, gapCategory: 'customer' },
    { name: 'max_wait', value: 600, gapCategory: 'timing' },
    { name: 'served_rate', value: 25, gapCategory: 'timing' },
    { name: 'bypass_eligible', value: false, gapCategory: 'customer' },
  ],
  [JourneyEvent.QUEUE_POLL_1]: [
    { name: 'position', value: 3890, gapCategory: 'customer' },
    { name: 'position_delta', value: -631, gapCategory: 'timing' },
    { name: 'poll_latency_ms', value: 45, gapCategory: 'timing' },
    {
      name: 'server_time',
      value: '2026-01-26T00:02:05.000Z',
      gapCategory: 'timing',
    },
    {
      name: 'client_time',
      value: '2026-01-26T00:02:05.012Z',
      gapCategory: 'timing',
    },
    { name: 'drift_ms', value: 12, gapCategory: 'timing' },
    { name: 'retry_count', value: 0, gapCategory: 'infra' },
    { name: 'connection_quality', value: 'good', gapCategory: 'infra' },
    { name: 'poll_interval', value: 5000, gapCategory: 'timing' },
    {
      name: 'next_poll_at',
      value: '2026-01-26T00:02:10.000Z',
      gapCategory: 'timing',
    },
  ],
  [JourneyEvent.QUEUE_POLL_2]: [
    { name: 'position', value: 2456, gapCategory: 'customer' },
    { name: 'remaining_wait', value: 98, gapCategory: 'timing' },
    { name: 'users_ahead', value: 2455, gapCategory: 'infra' },
    { name: 'estimated_rate', value: 25, gapCategory: 'timing' },
    { name: 'queue_health', value: 'healthy', gapCategory: 'infra' },
    { name: 'congestion_level', value: 'low', gapCategory: 'infra' },
    {
      name: 'predicted_admit_time',
      value: '2026-01-26T00:03:45.000Z',
      gapCategory: 'timing',
    },
    { name: 'slot_availability', value: 85, gapCategory: 'infra' },
    { name: 'capacity_percentage', value: 72, gapCategory: 'infra' },
    { name: 'dynamic_priority', value: 1.2, gapCategory: 'customer' },
  ],
  [JourneyEvent.QUEUE_NEXT]: [
    { name: 'promoted', value: true, gapCategory: 'customer' },
    {
      name: 'promotion_reason',
      value: 'position_reached',
      gapCategory: 'customer',
    },
    { name: 'final_position', value: 1, gapCategory: 'customer' },
    { name: 'total_wait_time', value: 145000, gapCategory: 'timing' },
    { name: 'fairness_score', value: 0.98, gapCategory: 'customer' },
    { name: 'segment_rank', value: 'standard', gapCategory: 'customer' },
    { name: 'vip_override', value: false, gapCategory: 'customer' },
    { name: 'emergency_bypass', value: false, gapCategory: 'infra' },
    { name: 'slot_id', value: 'slot-7f3e2d1c', gapCategory: 'trace' },
    { name: 'admit_window', value: 30000, gapCategory: 'timing' },
  ],
  [JourneyEvent.TOKEN_GRANT]: [
    { name: 'token_type', value: 'access', gapCategory: 'security' },
    { name: 'token_ttl', value: 3600, gapCategory: 'timing' },
    {
      name: 'signing_node',
      value: 'token-svc-03',
      isClue: true,
      gapCategory: 'infra',
    },
    {
      name: 'signing_algorithm',
      value: 'ES256',
      isClue: true,
      gapCategory: 'security',
    },
    { name: 'key_id', value: 'key-2026-01', gapCategory: 'security' },
    { name: 'token_size', value: 0, gapCategory: 'infra' },
    { name: 'claims_count', value: 0, gapCategory: 'security' },
    { name: 'audience', value: 'shop.example.com', gapCategory: 'infra' },
    { name: 'issuer', value: 'auth.example.com', gapCategory: 'infra' },
    { name: 'token_hash', value: 'N/A', gapCategory: 'trace' },
  ],
  [JourneyEvent.ADMITTED]: [
    { name: 'session_token', value: 'N/A', gapCategory: 'trace' },
    { name: 'final_action', value: 'blocked', gapCategory: 'security' },
    { name: 'origin_target', value: '/checkout', gapCategory: 'trace' },
    { name: 'origin_ip', value: '10.0.2.15', gapCategory: 'infra' },
    { name: 'origin_latency_ms', value: 0, gapCategory: 'timing' },
    { name: 'load_balancer', value: 'lb-west-02', gapCategory: 'infra' },
    { name: 'sticky_session', value: false, gapCategory: 'infra' },
    { name: 'cache_status', value: 'miss', gapCategory: 'infra' },
    { name: 'response_code', value: 500, gapCategory: 'infra' },
    { name: 'bytes_transferred', value: 0, gapCategory: 'timing' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// COLOR SCHEME
// ─────────────────────────────────────────────────────────────────────────────

const STEP_COLORS: Record<JourneyEvent, string> = {
  [JourneyEvent.CONNECT]: '#00d4ff',
  [JourneyEvent.TLS_HANDSHAKE]: '#00d4ff',
  [JourneyEvent.WAF_CHECK]: '#ff6b35',
  [JourneyEvent.GEO_CHECK]: '#ff6b35',
  [JourneyEvent.BOT_CHECK_START]: '#ff6b35',
  [JourneyEvent.JS_CHALLENGE]: '#ff6b35',
  [JourneyEvent.CAPTCHA_PRESENTED]: '#ffd700',
  [JourneyEvent.CAPTCHA_SOLVED]: '#ffd700',
  [JourneyEvent.INTEGRITY_PASSED]: '#ffd700',
  [JourneyEvent.QUEUE_ENTER]: '#a855f7',
  [JourneyEvent.QUEUE_POLL_1]: '#a855f7',
  [JourneyEvent.QUEUE_POLL_2]: '#a855f7',
  [JourneyEvent.QUEUE_NEXT]: '#a855f7',
  [JourneyEvent.TOKEN_GRANT]: '#22c55e',
  [JourneyEvent.ADMITTED]: '#22c55e',
};

const GAP_NAMES = {
  trace: 'Trace',
  customer: 'Customer',
  security: 'Security',
  timing: 'Timing',
  infra: 'Infra',
};

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
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <span className={styles.icon}>🔍</span>
            Wide Event Builder
          </h1>
          <p className={styles.subtitle}>
            Connect the clues to reveal the full story
          </p>
        </div>

        {/* Investigation Progress nested in Header */}
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <h3 className={styles.progressTitle}>🎯 Investigation Progress</h3>
            <div className={styles.clueCounter}>
              <span>
                💡 Clues Found: {cluesFound}/{totalClues}
              </span>
              {rootCauseUnlocked && (
                <button className={styles.selectAllButton} onClick={selectAll}>
                  ✨ Select All
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
                    {status === 'empty' && '○'}
                    {status === 'partial' && '◐'}
                    {status === 'complete' && '●'}
                  </div>
                  <span className={styles.gapName}>
                    {GAP_NAMES[gap as keyof typeof GAP_NAMES]}
                  </span>
                </div>
              );
            })}
          </div>

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
                  <strong>TLS 1.0</strong> +{' '}
                  <strong>Sanctioned Region (IR)</strong> +{' '}
                  <strong>High Bot Score (0.89)</strong> = Token crypto failure.
                  ES256 algorithm requires TLS 1.2+ for secure key derivation.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left Panel: Journey Timeline */}
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
                      {isErrorStep && (
                        <span className={styles.errorBadge}>⚠️</span>
                      )}
                      {hasClue && !isErrorStep && showClues && (
                        <span className={styles.clueBadge}>🔑</span>
                      )}
                    </span>
                    <span className={styles.stepCount}>
                      {selectedCount > 0 && `${selectedCount}/${fields.length}`}
                    </span>
                    <span className={styles.chevron}>
                      {isExpanded ? '▼' : '▶'}
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
                                  onChange={() =>
                                    toggleField(stepId, field.name)
                                  }
                                  className={styles.checkbox}
                                />
                              </div>
                              <span className={styles.fieldName}>
                                {field.name}
                              </span>
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

        {/* Right Panel: JSON Preview */}
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
                        <div style={{ marginBottom: '12px' }}>
                          <strong
                            style={{
                              color: '#ffd700',
                              display: 'block',
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '4px',
                            }}
                          >
                            User Reported Issue
                          </strong>
                          <div
                            style={{ fontStyle: 'italic', fontSize: '0.85rem' }}
                          >
                            "I entered the queue, but the page crashed with a
                            'Secure Connection' error after the queue."
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
            <pre className={styles.jsonPre}>
              {renderColorizedJson(jsonPreview)}
            </pre>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper to render colorized JSON
function renderColorizedJson(obj: Record<string, unknown>): React.ReactNode {
  const lines: React.ReactNode[] = [];
  let lineNum = 0;

  const addLine = (content: React.ReactNode, indent: number = 0) => {
    lines.push(
      <div key={lineNum++} style={{ paddingLeft: `${indent * 16}px` }}>
        {content}
      </div>,
    );
  };

  addLine(<span style={{ color: '#fff' }}>{'{'}</span>);

  // Base fields
  const baseFields = [
    'timestamp',
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
        <span style={{ color: '#9cdcfe' }}>"{key}"</span>
        <span style={{ color: '#fff' }}>: </span>
        <span style={{ color: key === 'severity' ? '#f44747' : '#ce9178' }}>
          "{String(val)}"
        </span>
        <span style={{ color: '#fff' }}>{comma}</span>
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
    const color = stepId ? STEP_COLORS[Number(stepId) as JourneyEvent] : '#888';

    addLine(
      <span
        style={{ color: '#6a9955' }}
      >{`// ═══ ${stepName.toUpperCase()} ═══`}</span>,
      1,
    );
    addLine(
      <>
        <span style={{ color }}>"{stepName}"</span>
        <span style={{ color: '#fff' }}>: {'{'}</span>
      </>,
      1,
    );

    const fieldKeys = Object.keys(stepData);
    fieldKeys.forEach((fieldKey, fieldIdx) => {
      const val = stepData[fieldKey];
      const comma = fieldIdx < fieldKeys.length - 1 ? ',' : '';
      const isClue = JOURNEY_FIELDS[Number(stepId) as JourneyEvent]?.find(
        (f) => f.name === fieldKey,
      )?.isClue;

      addLine(
        <>
          <span style={{ color: isClue ? '#ffd700' : '#9cdcfe' }}>
            "{fieldKey}"
          </span>
          <span style={{ color: '#fff' }}>: </span>
          <span
            style={{ color: typeof val === 'string' ? '#ce9178' : '#b5cea8' }}
          >
            {typeof val === 'string' ? `"${val}"` : String(val)}
          </span>
          <span style={{ color: '#fff' }}>{comma}</span>
          {isClue && (
            <span style={{ color: '#ffd700', marginLeft: 8 }}>← CLUE!</span>
          )}
        </>,
        2,
      );
    });

    const endComma = stepIdx < enrichedKeys.length - 1 ? ',' : '';
    addLine(<span style={{ color: '#fff' }}>{`}${endComma}`}</span>, 1);
  });

  addLine(<span style={{ color: '#fff' }}>{'}'}</span>);

  return lines;
}
