/// <reference lib="webworker" />

import { WorkerLogStore } from './worker-store';
import { CHUNK_SIZE } from '../constants';
import { SimulationEngine, LogData } from './simulation-engine';
import { QueryHandler } from './query-handler';

// State managed by worker/engine
const workerStore = new WorkerLogStore();
const queryHandler = new QueryHandler(workerStore);

// Output Chunking Buffers
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
let chunkRegions = new Uint8Array(CHUNK_SIZE);
let chunkUserAgents = new Uint8Array(CHUNK_SIZE);

let isRunning = false;
let targetUsers = 1;
let lastActiveCount = 0;

const simulationEngine = new SimulationEngine((log: LogData) => {
  pushLogToChunk(log);
});

function pushLogToChunk(log: LogData) {
  if (chunkPtr >= CHUNK_SIZE) {
    flushChunk();
  }

  chunkTimestamps[chunkPtr] = log.time;
  chunkJourneyIds[chunkPtr] = log.journeyId;
  chunkEventIds[chunkPtr] = log.event;
  chunkSeverities[chunkPtr] = log.severity;
  chunkMetaIndices[chunkPtr] = log.meta;
  chunkCustomerIds[chunkPtr] = log.customerId;
  chunkCustomerSegments[chunkPtr] = log.customerSegment;
  chunkIps[chunkPtr] = log.ip;
  chunkWaitingRoomIds[chunkPtr] = log.waitingRoomId;
  chunkRegions[chunkPtr] = log.region;
  chunkUserAgents[chunkPtr] = log.userAgent;
  chunkPtr++;

  workerStore.push(
    log.time,
    log.journeyId,
    log.event,
    log.severity,
    log.meta,
    log.customerId,
    log.customerSegment,
    log.ip,
    log.waitingRoomId,
    log.region,
    log.userAgent,
  );
}

function flushChunk() {
  if (chunkPtr === 0) return;

  const ts = chunkTimestamps.slice(0, chunkPtr);
  const id = chunkJourneyIds.slice(0, chunkPtr);
  const eid = chunkEventIds.slice(0, chunkPtr);
  const sev = chunkSeverities.slice(0, chunkPtr);
  const meta = chunkMetaIndices.slice(0, chunkPtr);
  const cids = chunkCustomerIds.slice(0, chunkPtr);
  const csegs = chunkCustomerSegments.slice(0, chunkPtr);
  const ips = chunkIps.slice(0, chunkPtr);
  const wids = chunkWaitingRoomIds.slice(0, chunkPtr);
  const regs = chunkRegions.slice(0, chunkPtr);
  const uas = chunkUserAgents.slice(0, chunkPtr);

  self.postMessage(
    {
      type: 'BATCH',
      payload: {
        timestamps: ts,
        journeyIds: id,
        eventIds: eid,
        severities: sev,
        metaIndices: meta,
        customerIds: cids,
        customerSegments: csegs,
        ips: ips,
        waitingRoomIds: wids,
        regions: regs,
        userAgents: uas,
        activeCount: lastActiveCount,
      },
    },
    [
      ts.buffer,
      id.buffer,
      eid.buffer,
      sev.buffer,
      meta.buffer,
      cids.buffer,
      csegs.buffer,
      ips.buffer,
      wids.buffer,
      regs.buffer,
      uas.buffer,
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
  chunkRegions = new Uint8Array(CHUNK_SIZE);
  chunkUserAgents = new Uint8Array(CHUNK_SIZE);
}

function tick() {
  if (!isRunning) return;

  const result = simulationEngine.tick(targetUsers);
  lastActiveCount = result.activeCount;

  if (chunkPtr > 0) {
    flushChunk();
  }

  if (result.isFinished) {
    isRunning = false;
    self.postMessage({ type: 'FINISHED' });
    return;
  }

  setTimeout(tick, 50);
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  if (type === 'START') {
    isRunning = true;
    setTimeout(tick, 0);
  } else if (type === 'STOP') {
    isRunning = false;
  } else if (type === 'SET_USERS') {
    targetUsers = payload;
  } else if (type === 'RESET') {
    isRunning = false;
    chunkPtr = 0;
    simulationEngine.reset();
    workerStore.reset();

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
    chunkRegions = new Uint8Array(CHUNK_SIZE);
    chunkUserAgents = new Uint8Array(CHUNK_SIZE);

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
        regions: new Uint8Array(0),
        userAgents: new Uint8Array(0),
        activeCount: 0,
      },
    });
  } else if (type === 'QUERY') {
    queryHandler.handleQuery(payload.queryId, payload.sql, (msg) =>
      self.postMessage(msg),
    );
  }
};
