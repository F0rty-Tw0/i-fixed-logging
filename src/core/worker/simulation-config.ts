import { JourneyEvent } from '../types/domain';

export const STATE_INACTIVE = 255;
export const STATE_COMPLETED = 254;
export const MAX_SPAWNS_PER_TICK = 50;
export const CHUNK_SIZE = 10000;

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
