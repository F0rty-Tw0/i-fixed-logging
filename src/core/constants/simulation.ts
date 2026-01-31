import { JourneyEvent } from '../types/domain';

export const MAX_LOGS = 1_500_000;
export const MAX_USERS = 10_000;
export const CHUNK_SIZE = 10000;
export const TICK_INTERVAL = 16; // ms

// Data ranges for simulation
export const CUSTOMER_POOL_SIZE = 50_000;
export const IP_POOL_SIZE = 100_000;
export const WAITING_ROOM_COUNT = 10;

// Fixed Customer IDs
export const CUSTOMER_ID_VIP = 77777;
export const CUSTOMER_ID_STANDARD = 88888;

export const STATE_INACTIVE = 255;
export const STATE_COMPLETED = 254;
export const MAX_SPAWNS_PER_TICK = 50;

export const JOURNEY_SEQUENCE = [
  JourneyEvent.CONNECT,
  JourneyEvent.TLS_HANDSHAKE,
  JourneyEvent.WAF_CHECK,
  JourneyEvent.GEO_CHECK,
  JourneyEvent.BOT_CHECK_START,
  JourneyEvent.JS_CHALLENGE,
  JourneyEvent.CAPTCHA_PRESENTED,
  JourneyEvent.CAPTCHA_SOLVED,
  JourneyEvent.INTEGRITY_PASSED,
  JourneyEvent.QUEUE_ENTER,
  JourneyEvent.QUEUE_POLL_1,
  JourneyEvent.QUEUE_POLL_2,
  JourneyEvent.QUEUE_NEXT,
  JourneyEvent.TOKEN_GRANT,
  JourneyEvent.ADMITTED,
];

export const REGIONS = ['US-EAST', 'US-WEST', 'EU-WEST', 'AP-SOUTH', 'SA-EAST'];
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Mobile/15E148',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
];

export const LOG_COLUMNS = [
  'timestamp',
  'journey_id',
  'event',
  'severity',
  'latency',
  'customer_id',
  'customer_segment',
  'ip',
  'waiting_room_id',
  'region',
  'user_agent',
] as const;
