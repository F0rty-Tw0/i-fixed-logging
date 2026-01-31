import { JourneyEvent } from '../types/domain';

export const STEP_COLORS: Record<JourneyEvent, string> = {
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

export const GAP_NAMES = {
  trace: 'Trace',
  customer: 'Customer',
  security: 'Security',
  timing: 'Timing',
  infra: 'Infra',
};

export const PREDEFINED_FILTERS = [
  { label: 'All Logs', sql: 'SELECT * FROM logs LIMIT 100' },
  {
    label: 'Avg Latency',
    sql: 'SELECT event, AVG(latency), COUNT(*) FROM logs GROUP BY event ORDER BY AVG(latency) DESC',
  },
  {
    label: 'VIP Errors',
    sql: "SELECT * FROM logs WHERE customer_segment = 'VIP' AND severity = 'ERROR' ORDER BY timestamp DESC LIMIT 100",
  },
  {
    label: 'Security Blockade',
    sql: "SELECT ip, COUNT(*) FROM logs WHERE severity = 'BLOCK' GROUP BY ip ORDER BY COUNT(*) DESC LIMIT 10",
  },
  {
    label: 'Error Hotspots',
    sql: "SELECT event, COUNT(*) FROM logs WHERE severity = 'ERROR' GROUP BY event ORDER BY COUNT(*) DESC",
  },
  {
    label: 'Recent Criticals',
    sql: "SELECT * FROM logs WHERE severity = 'BLOCK' ORDER BY timestamp DESC LIMIT 50",
  },
  {
    label: 'Region Heatmap',
    sql: 'SELECT region, COUNT(*) FROM logs GROUP BY region ORDER BY COUNT(*) DESC',
  },
];
