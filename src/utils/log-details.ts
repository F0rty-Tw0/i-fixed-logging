import { JourneyEvent, LogSeverityId, EVENT_NAMES } from '../core/types/domain';
import { CUSTOMER_ID_VIP } from '../core/constants';

type LogInfo = {
  trace_id: string;
  request_id: string;
  node: string;
  customer?: string;
  waiting_room?: string;
  customer_segment?: string;
  years_with_us?: number;
  error_code?: string;
  cause?: string;
  stack_trace?: string;
  warn_code?: string;
  message?: string;
  client_ip?: string;
  [key: string]: string | number | boolean | undefined;
};
// Simple deterministic RNG based on seed
// Simple deterministic RNG based on sfc32
function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function stir(seed: number): number {
  let h = seed ^ 0xdeadbeef;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return h ^ (h >>> 15);
}

export function getLogSource(eventId: JourneyEvent): string {
  const sourceMap: Record<JourneyEvent, string> = {
    [JourneyEvent.CONNECT]: 'edge-gateway',
    [JourneyEvent.TLS_HANDSHAKE]: 'edge-gateway',
    [JourneyEvent.WAF_CHECK]: 'security-service',
    [JourneyEvent.GEO_CHECK]: 'security-service',
    [JourneyEvent.BOT_CHECK_START]: 'bot-detector',
    [JourneyEvent.JS_CHALLENGE]: 'bot-detector',
    [JourneyEvent.CAPTCHA_PRESENTED]: 'challenge-ui',
    [JourneyEvent.CAPTCHA_SOLVED]: 'challenge-ui',
    [JourneyEvent.INTEGRITY_PASSED]: 'identity-service',
    [JourneyEvent.QUEUE_ENTER]: 'waitingroom-engine',
    [JourneyEvent.QUEUE_POLL_1]: 'waitingroom-engine',
    [JourneyEvent.QUEUE_POLL_2]: 'waitingroom-engine',
    [JourneyEvent.QUEUE_NEXT]: 'waitingroom-engine',
    [JourneyEvent.TOKEN_GRANT]: 'token-service',
    [JourneyEvent.ADMITTED]: 'origin-admitter',
  };
  return sourceMap[eventId] || 'unknown-service';
}

// LRU Cache for log details to avoid redundant RNG/string operations
const DETAILS_CACHE = new Map<string, LogInfo>();
const MAX_CACHE_SIZE = 1000;

export function generateLogDetails(
  journeyId: number,
  eventId: JourneyEvent,
  severity?: LogSeverityId,
  waitingRoomId?: number,
  customerId?: number,
  latency?: number,
  ip?: number,
  absIndex?: number, // Optional stable key for better caching
  timestamp?: number,
) {
  // Use absIndex as cache key if available, otherwise hash the critical inputs
  const cacheKey =
    absIndex !== undefined
      ? `idx-${absIndex}`
      : `${journeyId}-${eventId}-${severity}-${latency}-${ip}-${timestamp}`;

  const cached = DETAILS_CACHE.get(cacheKey);
  if (cached) return cached;
  // Seed the RNG with journeyId + eventId for consistent results per log
  const s = stir(journeyId ^ (eventId * 10000));
  const rand = sfc32(s, s + 1, s + 2, s + 3);
  for (let i = 0; i < 4; i++) rand(); // Warm up

  // Trace ID is session-based (constant for a journeyId)
  // Request ID is event-based (unique per log)
  const traceId = `trc-${journeyId.toString(36).padStart(6, '0')}`;
  const requestId = `req-${(journeyId ^ ((eventId * 0xdeadbeef) >>> 0)).toString(16).padStart(8, '0')}`;

  // Use provided IP or fallback to deterministic IP per Journey if not provided
  let clientIp: string;
  if (ip !== undefined) {
    clientIp = [
      (ip >>> 24) & 0xff,
      (ip >>> 16) & 0xff,
      (ip >>> 8) & 0xff,
      ip & 0xff,
    ].join('.');
  } else {
    const ipRand = sfc32(
      journeyId,
      journeyId + 1,
      journeyId + 2,
      journeyId + 3,
    );
    clientIp = `${Math.floor(ipRand() * 223) + 1}.${Math.floor(ipRand() * 255)}.${Math.floor(ipRand() * 255)}.${Math.floor(ipRand() * 255)}`;
  }

  const base: LogInfo = {
    trace_id: traceId,
    request_id: requestId,
    client_ip: clientIp,
    node: getLogSource(eventId),
    customer:
      customerId === CUSTOMER_ID_VIP
        ? 'VIP Customer Alpha'
        : 'Standard Customer Beta',
    customer_segment: customerId === CUSTOMER_ID_VIP ? 'VIP' : 'Standard',
    waiting_room: `WR-${(waitingRoomId || 0).toString().padStart(2, '0')}`,
    message: `${EVENT_NAMES[eventId].replace(/_/g, ' ')} processing`,
    timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
  };

  if (customerId === CUSTOMER_ID_VIP) {
    base.years_with_us = 5;
  }

  // Inject Error/Warn details if applicable
  if (severity === LogSeverityId.ERROR) {
    const errorMap: Record<number, string[]> = {
      [JourneyEvent.CONNECT]: [
        'Connection timed out',
        'Target host unreachable',
        'DNS resolution failure',
      ],
      [JourneyEvent.TLS_HANDSHAKE]: [
        'SSL handshake failed',
        'Cipher suite mismatch',
        'Certificate expired',
      ],
      [JourneyEvent.WAF_CHECK]: [
        'SQL Injection attempt blocked',
        'Cross-site scripting (XSS) detected',
        'Malicious User-Agent blocked',
      ],
      [JourneyEvent.GEO_CHECK]: [
        'IP address from restricted territory',
        'Geo-IP database lookup failed',
      ],
      [JourneyEvent.BOT_CHECK_START]: [
        'Headless browser signature detected',
        'High-frequency automated request detected',
      ],
      [JourneyEvent.JS_CHALLENGE]: [
        'JavaScript challenge timeout',
        'Integrity check failed',
      ],
      [JourneyEvent.CAPTCHA_PRESENTED]: [
        'Failed to load CAPTCHA provider',
        'UI initialization error',
      ],
      [JourneyEvent.CAPTCHA_SOLVED]: [
        'CAPTCHA validation error',
        'Token reuse attempt detected',
      ],
      [JourneyEvent.QUEUE_ENTER]: [
        'Waiting room capacity exceeded',
        'Queue assignment failure',
      ],
      [JourneyEvent.TOKEN_GRANT]: [
        'Token signing service unavailable',
        'Key rotation in progress - retry',
      ],
      [JourneyEvent.ADMITTED]: [
        'Backend origin gateway timeout',
        'Upstream server returned 502 Bad Gateway',
      ],
    };

    const causes = errorMap[eventId] || [
      'Internal service error',
      'Unexpected state transition',
    ];
    const cause = causes[Math.floor(rand() * causes.length)];

    base['error_code'] = `ERR-${Math.floor(rand() * 500) + 1000}`;
    base['cause'] = cause;
    base['message'] = cause; // Replace generic message with actual error
    base['stack_trace'] =
      `Error: ${cause}\n    at processRequest (worker.ts:241:12)\n    at async handleStream (service.ts:88:4)`;
  } else if (severity === LogSeverityId.CRITICAL) {
    const blockMap: Record<number, string[]> = {
      [JourneyEvent.WAF_CHECK]: [
        'Request blocked by WAF: SQLi signature matched',
        'Malicious payload blocked',
        'Blocked by Rate-Limit rule',
      ],
      [JourneyEvent.GEO_CHECK]: [
        'Access denied from restricted geography',
        'Origin IP belongs to a sanctioned region',
      ],
      [JourneyEvent.BOT_CHECK_START]: [
        'Highly suspected bot activity signature blocked',
        'Data center IP range blocked',
      ],
      [JourneyEvent.JS_CHALLENGE]: [
        'Failed to complete JS challenge - suspicious environment',
      ],
    };

    const causes = blockMap[eventId] || [
      'Access denied by security policy',
      'Request terminated by security filter',
    ];
    const cause = causes[Math.floor(rand() * causes.length)];

    base['error_code'] = `SEC-BLK-${Math.floor(rand() * 900) + 100}`;
    base['cause'] = cause;
    base['message'] = cause;
  } else if (severity === LogSeverityId.WARN) {
    if (latency && latency > 1500) {
      base['warn_code'] = 'WARN-LATENCY-001';
      base['message'] =
        `High latency detected (${latency.toFixed(0)}ms in ${getLogSource(eventId)})`;
    } else {
      const warnMap: Record<number, string[]> = {
        [JourneyEvent.CONNECT]: ['Slow TCP handshake', 'Retrying connection'],
        [JourneyEvent.TLS_HANDSHAKE]: [
          'Insecure TLS 1.0/1.1 attempt',
          'SNI hostname mismatch (ignored)',
        ],
        [JourneyEvent.WAF_CHECK]: [
          'Suspicious payload score high (allowed)',
          'WAF ruleset approaching update',
        ],
        [JourneyEvent.QUEUE_POLL_1]: [
          'Queue polling delay increased',
          'Sync delay detected',
        ],
        [JourneyEvent.TOKEN_GRANT]: ['Session token nearing expiry'],
      };

      const causes = warnMap[eventId] || [
        'Unusual resource usage',
        'Configuration slightly drifted',
        'Retry attempt 1/3',
      ];
      const cause = causes[Math.floor(rand() * causes.length)];

      base['warn_code'] = `WARN-${Math.floor(rand() * 100) + 100}`;
      base['message'] = cause;
    }
  }

  const result = detailsResult();

  // LRU Maintenance
  if (DETAILS_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = DETAILS_CACHE.keys().next().value;
    if (firstKey !== undefined) DETAILS_CACHE.delete(firstKey);
  }
  DETAILS_CACHE.set(cacheKey, result);

  return result;

  function detailsResult(): LogInfo {
    switch (eventId) {
      case JourneyEvent.CONNECT:
        return {
          ...base,
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          tls_version: rand() > 0.5 ? 'TLS 1.3' : 'TLS 1.2',
          cipher: 'TLS_AES_128_GCM_SHA256',
        };
      case JourneyEvent.WAF_CHECK:
        return {
          ...base,
          rules_checked: Math.floor(rand() * 100) + 10,
          score: Math.floor(rand() * 100),
          action: 'allow',
          risk_level: rand() > 0.9 ? 'high' : 'low',
        };
      case JourneyEvent.GEO_CHECK:
        const countries = ['US', 'DE', 'FR', 'GB', 'JP', 'BR', 'AU'];
        return {
          ...base,
          country: countries[Math.floor(rand() * countries.length)],
          region: `region-${Math.floor(rand() * 10)}`,
          asn: Math.floor(rand() * 10000) + 1000,
        };
      case JourneyEvent.BOT_CHECK_START:
      case JourneyEvent.JS_CHALLENGE:
        // Bot score should be journey-consistent "once assigned"
        const bs = stir(journeyId);
        const botRand = sfc32(bs, bs + 1, bs + 2, bs + 3);
        for (let i = 0; i < 4; i++) botRand();
        return {
          ...base,
          bot_score: botRand().toFixed(4),
          headless: false,
          webdriver: false,
          screen_res: '1920x1080',
        };
      case JourneyEvent.QUEUE_ENTER:
      case JourneyEvent.QUEUE_POLL_1:
      case JourneyEvent.QUEUE_POLL_2:
        return {
          ...base,
          queue_id: 'standard-queue',
          position: Math.floor(rand() * 5000),
          est_wait: `${Math.floor(rand() * 120)}s`,
        };
      case JourneyEvent.ADMITTED:
        return {
          ...base,
          session_token: `tok_${Math.floor(rand() * 1000000).toString(16)}`,
          final_action: 'redirect_origin',
          target: '/checkout',
        };
      default:
        return {
          ...base,
          details: 'Standard event processing',
          duration_us: Math.floor(rand() * 1000),
        };
    }
  }
}
