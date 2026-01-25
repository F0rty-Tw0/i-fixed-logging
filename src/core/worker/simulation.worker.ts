/// <reference lib="webworker" />

import {
  JourneyEvent,
  MAX_USERS,
  LogSeverityId,
  CUSTOMER_ID_VIP,
  CUSTOMER_ID_STANDARD,
  WAITING_ROOM_COUNT,
} from '../types/domain';

// Simulation State
const STATE_INACTIVE = 255;
const STATE_COMPLETED = 254;
const journeyStates = new Uint8Array(MAX_USERS).fill(STATE_INACTIVE); // Current Event ID
const journeySessionIds = new Int32Array(MAX_USERS); // Unique ID for current session in this slot
const journeyLastUpdateTimes = new Float64Array(MAX_USERS); // Last event timestamp
const journeyAdvanceProbs = new Float32Array(MAX_USERS); // Probability to advance per tick for current step
const journeyCustomerIds = new Int32Array(MAX_USERS);
const journeyIps = new Uint32Array(MAX_USERS);
const MAX_SPAWNS_PER_TICK = 50; // Allow fast ramp up to 50K
const journeyWaitingRoomIds = new Uint8Array(MAX_USERS);
let globalJourneyIdCounter = 1;
let totalOccupiedCount = 0; // Track occupied slots (Running or Completed)
let totalRunningCount = 0; // Track currently running slots

// Fixed Sequence
const JOURNEY_SEQUENCE = [
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

// Output Buffers (Double buffering or just create new ones per chunk)
// To avoid allocations, we can use a fixed Transferable buffer, but creating new small arrays is safer for now.
const CHUNK_SIZE = 10000;
let chunkPtr = 0;

let chunkTimestamps = new Float64Array(CHUNK_SIZE);
let chunkJourneyIds = new Int32Array(CHUNK_SIZE);
let chunkEventIds = new Uint8Array(CHUNK_SIZE);
let chunkSeverities = new Uint8Array(CHUNK_SIZE);
let chunkMetaIndices = new Int32Array(CHUNK_SIZE);
let chunkCustomerIds = new Int32Array(CHUNK_SIZE);
let chunkIps = new Uint32Array(CHUNK_SIZE);
let chunkWaitingRoomIds = new Int32Array(CHUNK_SIZE);

let isRunning = false;
let activeCount = 0;
let targetUsers = 1; // Default to 1 to match UI

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  if (type === 'START') {
    isRunning = true;
    requestAnimationFrame(tick);
  } else if (type === 'STOP') {
    isRunning = false;
  } else if (type === 'SET_USERS') {
    targetUsers = payload;
  } else if (type === 'RESET') {
    isRunning = false;
    activeCount = 0;
    totalOccupiedCount = 0;
    totalRunningCount = 0;
    chunkPtr = 0;
    journeyStates.fill(STATE_INACTIVE);
    journeySessionIds.fill(0);
    journeyLastUpdateTimes.fill(0);
    journeyAdvanceProbs.fill(0);
    globalJourneyIdCounter = 1;
    // Reset buffers
    chunkTimestamps = new Float64Array(CHUNK_SIZE);
    chunkJourneyIds = new Int32Array(CHUNK_SIZE);
    chunkEventIds = new Uint8Array(CHUNK_SIZE);
    chunkSeverities = new Uint8Array(CHUNK_SIZE);
    chunkMetaIndices = new Int32Array(CHUNK_SIZE);
    chunkCustomerIds = new Int32Array(CHUNK_SIZE);
    chunkIps = new Uint32Array(CHUNK_SIZE);
    chunkWaitingRoomIds = new Int32Array(CHUNK_SIZE);

    // Send empty batch to clear frontend stats immediately?
    // Actually, store clear handles frontend data, but we might want to sync activeCount
    self.postMessage({
      type: 'BATCH',
      payload: {
        timestamps: new Float64Array(0),
        journeyIds: new Int32Array(0),
        eventIds: new Uint8Array(0),
        severities: new Uint8Array(0),
        metaIndices: new Int32Array(0),
        customerIds: new Int32Array(0),
        ips: new Uint32Array(0),
        waitingRoomIds: new Int32Array(0),
        activeCount: 0,
      },
    });
  }
};

function tick() {
  if (!isRunning) return;

  const now = Date.now();

  // Logic:
  // We need to respect targetUsers GLOBALLY.
  // We track `activeOccupied` to ensure we don't spawn if the slot is either RUNNING or COMPLETED.
  // This ensures "Single Run" behavior: once a slot finishes, it stays "Occupied" (as Completed) and doesn't respawn.

  let spawnsThisTick = 0;

  for (let i = 0; i < MAX_USERS; i++) {
    const state = journeyStates[i];

    if (state === STATE_INACTIVE) {
      if (
        totalOccupiedCount < targetUsers &&
        spawnsThisTick < MAX_SPAWNS_PER_TICK
      ) {
        // Higher spawn chance for faster ramp up
        if (Math.random() < 0.1) {
          const jitter = Math.random() * 400;
          startJourney(i, now + jitter);

          spawnsThisTick++;
        }
      }
    } else if (state === STATE_COMPLETED) {
      // Do nothing
    } else {
      // Running
      if (Math.random() < journeyAdvanceProbs[i]) {
        const jitter = Math.random() * 50;
        advanceJourney(i, state, now + jitter);
      }
    }

    // Performance break: if we reached target and aren't scanning for status?
    // Actually, we must finish the loop to advance all journeys.
  }

  activeCount = totalRunningCount;

  // Flush if needed or periodically
  if (chunkPtr > 0) {
    flush();
  }

  // Report stats every second? Or attach to flush?
  // We'll attach stats to the batch message.

  setTimeout(tick, 50); // 20 ticks per second
}

function startJourney(id: number, time: number) {
  const startEvent = JOURNEY_SEQUENCE[0];
  journeyStates[id] = startEvent;
  journeySessionIds[id] = globalJourneyIdCounter++;
  journeyLastUpdateTimes[id] = time;
  totalOccupiedCount++;
  totalRunningCount++;

  // Determine next step latency (bi-modal)
  // Normal: ~200ms. Tick is 50ms. So 4 ticks. Prob = 1/4 = 0.25
  // Slow: ~2000ms. 40 ticks. Prob = 1/40 = 0.025
  // 2% chance of slow
  const isSlow = Math.random() < 0.01;
  journeyAdvanceProbs[id] = isSlow ? 0.025 : 0.25;

  // Latency is 0 for start (or small random connect time, but 0 is cleaner for start)
  // Determine customer and waiting room
  const isVip = Math.random() < 0.8; // 20% chance of being the VIP customer
  const customerId = isVip ? CUSTOMER_ID_VIP : CUSTOMER_ID_STANDARD;
  const ip = (Math.random() * 0xffffffff) >>> 0;

  // Distribute 10 waiting rooms across two customers.
  // VIP: 1-5, Standard: 6-10
  const waitingRoomId = isVip
    ? Math.floor(Math.random() * (WAITING_ROOM_COUNT / 2)) + 1
    : Math.floor(Math.random() * (WAITING_ROOM_COUNT / 2)) +
      (WAITING_ROOM_COUNT / 2 + 1);

  journeyCustomerIds[id] = customerId;
  journeyIps[id] = ip;
  journeyWaitingRoomIds[id] = waitingRoomId;

  pushLog(
    time,
    journeySessionIds[id],
    startEvent,
    LogSeverityId.INFO,
    0,
    customerId,
    ip,
    journeyWaitingRoomIds[id],
  );
}

function advanceJourney(id: number, currentState: number, time: number) {
  // Find current index
  // Optimization: We could store index in journeyStates instead, strictly 0..14.
  // Since we map specific Enum values to SEQUENCE, let's just find index.
  // The enum values are ACTUALLY 0..14, so currentState IS the index.
  const currentIndex = currentState;

  const nextIndex = currentIndex + 1;

  // Calculate latency
  const lastTime = journeyLastUpdateTimes[id];
  const latency = time - lastTime;
  journeyLastUpdateTimes[id] = time;

  // Determine next step latency (for the event AFTER this one)
  const isSlow = Math.random() < 0.01;
  journeyAdvanceProbs[id] = isSlow ? 0.025 : 0.25;

  if (nextIndex < JOURNEY_SEQUENCE.length) {
    const nextState = JOURNEY_SEQUENCE[nextIndex];
    journeyStates[id] = nextState;

    // Meaningful Severity & Termination Logic
    let severity = LogSeverityId.INFO;
    let shouldTerminate = false;
    const rand = Math.random();

    if (latency > 1500) {
      // High latency path
      if (rand < 0.05) {
        severity = LogSeverityId.ERROR; // 5% chance of timeout/error in slow path
        shouldTerminate = true;
      } else if (rand < 0.1) {
        severity = LogSeverityId.WARN; // 15% chance of warning
      }
    } else {
      // Normal path
      // Security-specific probability for BLOCK
      const isSecurityEvent =
        nextState === JourneyEvent.WAF_CHECK ||
        nextState === JourneyEvent.GEO_CHECK ||
        nextState === JourneyEvent.BOT_CHECK_START;

      if (isSecurityEvent && rand < 0.001) {
        // 0.1% chance to be blocked
        severity = LogSeverityId.CRITICAL;
        shouldTerminate = true;
      } else if (rand < 0.0005) {
        severity = LogSeverityId.ERROR; // 0.05% chance of random failure
        shouldTerminate = true;
      } else if (rand < 0.003) {
        severity = LogSeverityId.WARN; // ~0.25% chance of random warning
      }
    }

    pushLog(
      time,
      journeySessionIds[id],
      nextState,
      severity,
      latency,
      journeyCustomerIds[id],
      journeyIps[id],
      journeyWaitingRoomIds[id],
    );

    if (shouldTerminate) {
      journeyStates[id] = STATE_COMPLETED;
      totalRunningCount--;
    }
  } else {
    // End of journey normally
    journeyStates[id] = STATE_COMPLETED;
    totalRunningCount--;
  }
}

function pushLog(
  time: number,
  id: number,
  event: number,
  severity: number,
  meta: number,
  customerId: number,
  ip: number,
  waitingRoomId: number,
) {
  if (chunkPtr >= CHUNK_SIZE) {
    flush();
  }

  chunkTimestamps[chunkPtr] = time;
  chunkJourneyIds[chunkPtr] = id;
  chunkEventIds[chunkPtr] = event;
  chunkSeverities[chunkPtr] = severity;
  chunkMetaIndices[chunkPtr] = meta;
  chunkCustomerIds[chunkPtr] = customerId;
  chunkIps[chunkPtr] = ip;
  chunkWaitingRoomIds[chunkPtr] = waitingRoomId;
  chunkPtr++;
}

function flush() {
  if (chunkPtr === 0) return;

  // slice buffer to valid size (copy)
  // To minimize GC, we should transfer. But we have one reused buffer.
  // If we transfer, we lose reference.
  // Strategy: Copy to a new buffer to send, or have a pool of buffers.
  // Simple Copy for now:

  const ts = chunkTimestamps.slice(0, chunkPtr);
  const jid = chunkJourneyIds.slice(0, chunkPtr);
  const eid = chunkEventIds.slice(0, chunkPtr);
  const sev = chunkSeverities.slice(0, chunkPtr);
  const meta = chunkMetaIndices.slice(0, chunkPtr);
  const cids = chunkCustomerIds.slice(0, chunkPtr);
  const ips = chunkIps.slice(0, chunkPtr);
  const wids = chunkWaitingRoomIds.slice(0, chunkPtr);

  self.postMessage(
    {
      type: 'BATCH',
      payload: {
        timestamps: ts,
        journeyIds: jid,
        eventIds: eid,
        severities: sev,
        metaIndices: meta,
        customerIds: cids,
        ips: ips,
        waitingRoomIds: wids,
        activeCount: activeCount,
      },
    },
    [
      ts.buffer,
      jid.buffer,
      eid.buffer,
      sev.buffer,
      meta.buffer,
      cids.buffer,
      ips.buffer,
      wids.buffer,
    ],
  ); // Transfer ownership!

  chunkPtr = 0;
  // Ptr reset. But wait, we transferred the buffers! They are now detached (length 0).
  // We MUST allocate new ones.

  chunkTimestamps = new Float64Array(CHUNK_SIZE);
  chunkJourneyIds = new Int32Array(CHUNK_SIZE);
  chunkEventIds = new Uint8Array(CHUNK_SIZE);
  chunkSeverities = new Uint8Array(CHUNK_SIZE);
  chunkMetaIndices = new Int32Array(CHUNK_SIZE);
  chunkCustomerIds = new Int32Array(CHUNK_SIZE);
  chunkIps = new Uint32Array(CHUNK_SIZE);
  chunkWaitingRoomIds = new Int32Array(CHUNK_SIZE);
}
