export type JourneyId = number & { readonly __brand: 'JourneyId' };
export type CustomerId = number & { readonly __brand: 'CustomerId' };

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
  regions: Uint8Array;
  userAgents: Uint8Array;
  activeCount: number;
}

export type LogColumn =
  | 'timestamp'
  | 'journey_id'
  | 'event'
  | 'severity'
  | 'latency'
  | 'customer_id'
  | 'customer_segment'
  | 'ip'
  | 'ip_numeric'
  | 'waiting_room_id'
  | 'region'
  | 'user_agent'
  | 'event_id'
  | 'severity_id';

export interface TraceSummary {
  traceId: JourneyId;
  startTime: number;
  endTime: number;
  duration: number;
  eventCount: number;
  maxSeverity: LogSeverityId;
  lastEvent: JourneyEvent;
  customerSegment: number;
}
