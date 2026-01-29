/// <reference lib="webworker" />

import {
  JourneyEvent,
  MAX_USERS,
  LogSeverityId,
  CUSTOMER_ID_VIP,
  CUSTOMER_ID_STANDARD,
  WAITING_ROOM_COUNT,
} from '../types/domain';
import { WorkerLogStore } from './worker-store';
import { Lexer } from '../query/lexer';
import { Parser } from '../query/parser';
import { Evaluator, RowData } from '../query/evaluator';

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

const workerStore = new WorkerLogStore();

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
const CHUNK_SIZE = 10000;
let chunkPtr = 0;

let chunkTimestamps = new Float64Array(CHUNK_SIZE);
let chunkJourneyIds = new Int32Array(CHUNK_SIZE);
let chunkEventIds = new Uint8Array(CHUNK_SIZE);
let chunkSeverities = new Uint8Array(CHUNK_SIZE);
let chunkMetaIndices = new Int32Array(CHUNK_SIZE);
let chunkCustomerIds = new Int32Array(CHUNK_SIZE);
let chunkCustomerSegments = new Uint8Array(CHUNK_SIZE);
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
    chunkCustomerSegments = new Uint8Array(CHUNK_SIZE);
    chunkIps = new Uint32Array(CHUNK_SIZE);
    chunkWaitingRoomIds = new Int32Array(CHUNK_SIZE);
    workerStore.reset();

    self.postMessage({
      type: 'BATCH',
      payload: {
        timestamps: new Float64Array(0),
        journeyIds: new Int32Array(0),
        eventIds: new Uint8Array(0),
        severities: new Uint8Array(0),
        metaIndices: new Int32Array(0),
        customerIds: new Int32Array(0),
        customerSegments: new Uint8Array(0),
        ips: new Uint32Array(0),
        waitingRoomIds: new Int32Array(0),
        activeCount: 0,
      },
    });
  } else if (type === 'QUERY') {
    handleQuery(payload.queryId, payload.sql).catch((err) => {
      console.error('Query error handled in handler', err);
    });
  }
};

function tick() {
  if (!isRunning) return;

  const now = Date.now();

  let spawnsThisTick = 0;

  for (let i = 0; i < MAX_USERS; i++) {
    const state = journeyStates[i];

    if (state === STATE_INACTIVE) {
      if (
        totalOccupiedCount < targetUsers &&
        spawnsThisTick < MAX_SPAWNS_PER_TICK
      ) {
        if (Math.random() < 0.1) {
          const jitter = Math.random() * 400;
          startJourney(i, now + jitter);
          spawnsThisTick++;
        }
      }
    } else if (state === STATE_COMPLETED) {
      // Do nothing
    } else {
      if (Math.random() < journeyAdvanceProbs[i]) {
        const jitter = Math.random() * 50;
        advanceJourney(i, state, now + jitter);
      }
    }
  }

  activeCount = totalRunningCount;

  if (chunkPtr > 0) {
    flush();
  }

  setTimeout(tick, 50);
}

function startJourney(id: number, time: number) {
  const startEvent = JOURNEY_SEQUENCE[0];
  journeyStates[id] = startEvent;
  journeySessionIds[id] = globalJourneyIdCounter++;
  journeyLastUpdateTimes[id] = time;
  totalOccupiedCount++;
  totalRunningCount++;

  const isSlow = Math.random() < 0.01;
  journeyAdvanceProbs[id] = isSlow ? 0.025 : 0.25;

  const isVip = Math.random() < 0.8;
  const customerId = isVip ? CUSTOMER_ID_VIP : CUSTOMER_ID_STANDARD;
  const ip = (Math.random() * 0xffffffff) >>> 0;

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
    isVip ? 1 : 0,
    ip,
    journeyWaitingRoomIds[id],
  );
}

function advanceJourney(id: number, currentState: number, time: number) {
  const currentIndex = currentState;
  const nextIndex = currentIndex + 1;

  const lastTime = journeyLastUpdateTimes[id];
  const latency = time - lastTime;
  journeyLastUpdateTimes[id] = time;

  const isSlow = Math.random() < 0.01;
  journeyAdvanceProbs[id] = isSlow ? 0.025 : 0.25;

  if (nextIndex < JOURNEY_SEQUENCE.length) {
    const nextState = JOURNEY_SEQUENCE[nextIndex];
    journeyStates[id] = nextState;

    let severity = LogSeverityId.INFO;
    let shouldTerminate = false;
    const rand = Math.random();

    if (latency > 1500) {
      if (rand < 0.05) {
        severity = LogSeverityId.ERROR;
        shouldTerminate = true;
      } else if (rand < 0.1) {
        severity = LogSeverityId.WARN;
      }
    } else {
      const isSecurityEvent =
        nextState === JourneyEvent.WAF_CHECK ||
        nextState === JourneyEvent.GEO_CHECK ||
        nextState === JourneyEvent.BOT_CHECK_START;

      if (isSecurityEvent && rand < 0.001) {
        severity = LogSeverityId.CRITICAL;
        shouldTerminate = true;
      } else if (rand < 0.0005) {
        severity = LogSeverityId.ERROR;
        shouldTerminate = true;
      } else if (rand < 0.003) {
        severity = LogSeverityId.WARN;
      }
    }

    pushLog(
      time,
      journeySessionIds[id],
      nextState,
      severity,
      latency,
      journeyCustomerIds[id],
      journeyCustomerIds[id] === CUSTOMER_ID_VIP ? 1 : 0,
      journeyIps[id],
      journeyWaitingRoomIds[id],
    );

    if (shouldTerminate) {
      journeyStates[id] = STATE_COMPLETED;
      totalRunningCount--;
    }
  } else {
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
  customerSegment: number,
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
  chunkCustomerSegments[chunkPtr] = customerSegment;
  chunkIps[chunkPtr] = ip;
  chunkWaitingRoomIds[chunkPtr] = waitingRoomId;
  chunkPtr++;

  workerStore.push(
    time,
    id,
    event,
    severity,
    meta,
    customerId,
    customerSegment,
    ip,
    waitingRoomId,
  );
}

function flush() {
  if (chunkPtr === 0) return;

  const ts = chunkTimestamps.slice(0, chunkPtr);
  const jid = chunkJourneyIds.slice(0, chunkPtr);
  const eid = chunkEventIds.slice(0, chunkPtr);
  const sev = chunkSeverities.slice(0, chunkPtr);
  const meta = chunkMetaIndices.slice(0, chunkPtr);
  const cids = chunkCustomerIds.slice(0, chunkPtr);
  const csegs = chunkCustomerSegments.slice(0, chunkPtr);
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
        customerSegments: csegs,
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
      csegs.buffer,
      ips.buffer,
      wids.buffer,
    ],
  );

  chunkPtr = 0;
  chunkTimestamps = new Float64Array(CHUNK_SIZE);
  chunkJourneyIds = new Int32Array(CHUNK_SIZE);
  chunkEventIds = new Uint8Array(CHUNK_SIZE);
  chunkSeverities = new Uint8Array(CHUNK_SIZE);
  chunkMetaIndices = new Int32Array(CHUNK_SIZE);
  chunkCustomerIds = new Int32Array(CHUNK_SIZE);
  chunkCustomerSegments = new Uint8Array(CHUNK_SIZE);
  chunkIps = new Uint32Array(CHUNK_SIZE);
  chunkWaitingRoomIds = new Int32Array(CHUNK_SIZE);
}

async function handleQuery(queryId: string, sql: string) {
  try {
    const lexer = new Lexer(sql);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    if (ast.type !== 'Query') {
      throw new Error('Invalid query AST');
    }

    const results: Record<string, unknown>[] = [];
    const total = workerStore.getLength();
    const hasAggregates = ast.select.columns.some(
      (c) => c.type === 'Aggregate',
    );

    interface AggregateStats {
      sum: number;
      count: number;
    }

    const groupMap = new Map<
      string,
      { stats: Record<string, AggregateStats>; values: Record<string, unknown> }
    >();

    // Use zero-allocation functional accessor
    let currentRowIdx = 0;
    const rowAccessor: RowData = (field: string) =>
      workerStore.getValue(currentRowIdx, field);

    for (let i = 0; i < total; i++) {
      currentRowIdx = i;

      // Yield every 50k logs to allow simulation ticks to execute
      if (i > 0 && i % 50000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      let matches = false;
      if (!ast.where) {
        matches = true;
      } else {
        matches = Evaluator.evaluateExpression(
          ast.where,
          rowAccessor,
        ) as boolean;
      }

      if (matches) {
        if (hasAggregates) {
          const groupValues: Record<string, unknown> = {};
          let groupKey = 'global';
          if (ast.groupBy && ast.groupBy.length > 0) {
            groupKey = ast.groupBy
              .map((col) => {
                const val = workerStore.getValue(i, col);
                groupValues[col] = val;
                return `${col}:${val}`;
              })
              .join('|');
          } else {
            for (const col of ast.select.columns) {
              if (col.type === 'Column') {
                groupValues[col.name] = workerStore.getValue(i, col.name);
              }
            }
          }

          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, { stats: {}, values: groupValues });
          }
          const group = groupMap.get(groupKey)!;

          for (const col of ast.select.columns) {
            if (col.type === 'Aggregate') {
              const key = `${col.function}(${col.column})`;
              if (!group.stats[key]) {
                group.stats[key] = { sum: 0, count: 0 };
              }
              const rawVal =
                col.column === '*' ? 1 : workerStore.getValue(i, col.column);
              if (rawVal !== null && rawVal !== undefined) {
                const val = typeof rawVal === 'number' ? rawVal : 1;
                group.stats[key].sum += val;
                group.stats[key].count++;
              }
            }
          }
        } else {
          results.push(Evaluator.projectRow(ast.select, rowAccessor));
        }
      }
    }

    let finalResults: Record<string, unknown>[] = results;
    if (hasAggregates) {
      finalResults = [];
      for (const group of groupMap.values()) {
        const resRow: Record<string, unknown> = { ...group.values };
        for (const col of ast.select.columns) {
          if (col.type === 'Aggregate') {
            const key = `${col.function}(${col.column})`;
            const stats = group.stats[key];
            if (!stats) {
              resRow[key] = col.function === 'COUNT' ? 0 : null;
            } else {
              if (col.function === 'COUNT') resRow[key] = stats.count;
              else if (col.function === 'SUM') resRow[key] = stats.sum;
              else if (col.function === 'AVG')
                resRow[key] = stats.count > 0 ? stats.sum / stats.count : null;
            }
          }
        }
        finalResults.push(resRow);
      }
    }

    if (ast.orderBy) {
      const { column, direction } = ast.orderBy;
      finalResults.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'ASC' ? valA - valB : valB - valA;
        }
        const strA = String(valA);
        const strB = String(valB);
        if (strA < strB) return direction === 'ASC' ? -1 : 1;
        if (strA > strB) return direction === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    if (ast.limit !== undefined) {
      finalResults = finalResults.slice(0, ast.limit);
    }

    self.postMessage({
      type: 'QUERY_RESULTS',
      payload: {
        queryId,
        results: finalResults,
        columns: ast.select.isStar
          ? [
              'timestamp',
              'journey_id',
              'event',
              'severity',
              'latency',
              'customer_id',
              'customer_segment',
              'ip',
              'waiting_room_id',
            ]
          : ast.select.columns.map((c) =>
              c.type === 'Column' ? c.name : `${c.function}(${c.column})`,
            ),
      },
    });
  } catch (error: unknown) {
    self.postMessage({
      type: 'QUERY_ERROR',
      payload: {
        queryId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
