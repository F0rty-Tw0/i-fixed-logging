import { logStore } from './log-store';
import { MAX_LOGS } from '../constants';
import { TraceSummary } from '../types/domain';

export class TraceStore {
  private summaries: TraceSummary[] = [];
  private worker: Worker | null = null;
  private lastProcessed = 0;
  private throttle: NodeJS.Timeout | null = null;
  private listeners: ((summaries: TraceSummary[]) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker() {
    this.worker = new Worker(
      new URL('../worker/trace-aggregator.worker.ts', import.meta.url),
    );

    this.worker.onmessage = (e) => {
      const { type, summaries } = e.data;
      if (type === 'UPDATE') {
        this.summaries = summaries;
        this.notify();
      }
    };

    // Initial feed
    this.feedWorker(true);

    // Subscribe to logStore
    logStore.subscribe(() => this.throttledFeed());

    // Fallback refresh
    setInterval(() => this.feedWorker(), 2000);
  }

  private throttledFeed() {
    if (this.throttle) return;
    this.throttle = setTimeout(() => {
      this.feedWorker();
      this.throttle = null;
    }, 100);
  }

  private feedWorker(force = false) {
    const total = logStore.getTotalIngested();
    const last = this.lastProcessed;

    if (total < last) {
      this.worker?.postMessage({ type: 'RESET' });
      this.lastProcessed = 0;
      return;
    }

    if (total === last && !force) return;

    // Calculate how many to ingest, capping at MAX_LOGS
    let count = total - last;
    if (count > MAX_LOGS) {
      count = MAX_LOGS;
    }

    if (count === 0 && !force) return;

    // Adjust lastProcessed to be from where we are actually starting this batch
    const startFrom = total - count;

    const journeyIds = new Int32Array(count);
    const timestamps = new Float64Array(count);
    const eventIds = new Uint8Array(count);
    const severities = new Uint8Array(count);
    const customerSegments = new Uint8Array(count);

    for (let i = 0; i < count; i++) {
      const physicalIdx = (startFrom + i) % MAX_LOGS;
      const snap = logStore.getSnapshotByPhysicalIndex(physicalIdx);

      if (snap) {
        journeyIds[i] = snap.journeyId;
        timestamps[i] = snap.timestamp;
        eventIds[i] = snap.eventId;
        severities[i] = snap.severity;
        customerSegments[i] = snap.customerSegment;
      }
    }

    this.worker?.postMessage(
      {
        type: 'INGEST',
        payload: {
          journeyIds,
          timestamps,
          eventIds,
          severities,
          customerSegments,
          count,
        },
      },
      [
        journeyIds.buffer,
        timestamps.buffer,
        eventIds.buffer,
        severities.buffer,
        customerSegments.buffer,
      ],
    );

    this.lastProcessed = total;
  }

  public getSummaries() {
    return this.summaries;
  }

  public subscribe(cb: (summaries: TraceSummary[]) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.summaries));
  }
}

export const traceStore = new TraceStore();
