export enum JourneyEvent {
  CONNECT = 0,
  TLS_HANDSHAKE = 1,
  WAF_CHECK = 2,
  GEO_CHECK = 3,
  BOT_CHECK_START = 4,
  JS_CHALLENGE = 5,
  CAPTCHA_PRESENTED = 6,
  CAPTCHA_SOLVED = 7,
  INTEGRITY_PASSED = 8,
  QUEUE_ENTER = 9,
  QUEUE_POLL_1 = 10,
  QUEUE_POLL_2 = 11,
  QUEUE_NEXT = 12,
  TOKEN_GRANT = 13,
  ADMITTED = 14,
}

export const EVENT_NAMES: Record<JourneyEvent, string> = {
  [JourneyEvent.CONNECT]: 'connect',
  [JourneyEvent.TLS_HANDSHAKE]: 'tls_handshake',
  [JourneyEvent.WAF_CHECK]: 'waf_check',
  [JourneyEvent.GEO_CHECK]: 'geo_check',
  [JourneyEvent.BOT_CHECK_START]: 'bot_check_start',
  [JourneyEvent.JS_CHALLENGE]: 'js_challenge',
  [JourneyEvent.CAPTCHA_PRESENTED]: 'captcha_presented',
  [JourneyEvent.CAPTCHA_SOLVED]: 'captcha_solved',
  [JourneyEvent.INTEGRITY_PASSED]: 'integrity_passed',
  [JourneyEvent.QUEUE_ENTER]: 'queue_enter',
  [JourneyEvent.QUEUE_POLL_1]: 'queue_poll_1',
  [JourneyEvent.QUEUE_POLL_2]: 'queue_poll_2',
  [JourneyEvent.QUEUE_NEXT]: 'queue_next',
  [JourneyEvent.TOKEN_GRANT]: 'token_grant',
  [JourneyEvent.ADMITTED]: 'admitted',
};

// Enum for efficient transfer (Uint8)
export const enum LogSeverityId {
  INFO = 0,
  WARN = 1,
  ERROR = 2,
  CRITICAL = 3,
}

export type LogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'BLOCK';

export const MAX_LOGS = 1_500_000;
export const MAX_USERS = 100_000;

// Data ranges for simulation
export const CUSTOMER_POOL_SIZE = 50_000;
export const IP_POOL_SIZE = 100_000;
export const WAITING_ROOM_COUNT = 10;

// Fixed Customer IDs
export const CUSTOMER_ID_VIP = 77777;
export const CUSTOMER_ID_STANDARD = 88888;

export enum ViewMode {
  QUEUE_SIMULATOR = 'queue-simulator',
  TAIL_SAMPLING = 'tail-sampling',
  WIDE_EVENT = 'wide-event',
  STRUCTURED_LOGS = 'structured-logs',
  DISTRIBUTED_TRACING = 'distributed-tracing',
}

export interface BatchPayload {
  timestamps: Float64Array;
  journeyIds: Int32Array;
  eventIds: Uint8Array;
  severities: Uint8Array;
  metaIndices: Int32Array;
  customerIds: Int32Array;
  customerSegments: Uint8Array;
  ips: Uint32Array;
  waitingRoomIds: Int32Array;
  activeCount: number;
}
