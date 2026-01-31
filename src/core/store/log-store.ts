import { MAX_LOGS } from '../constants';
import {
  JourneyEvent,
  LogSeverityId,
  JourneyId,
  CustomerId,
} from '../types/domain';
import { SearchEngine } from './search-engine';
import { LogStatistics } from './log-statistics';
import { TailSamplingStore } from './tail-sampling-store';
import { LogCacheManager } from './log-cache-manager';

export type LogSnapshot = {
  timestamp: number;
  journeyId: JourneyId;
  eventId: JourneyEvent;
  severity: LogSeverityId;
  metaIndex: number;
  customerId: CustomerId;
  customerSegment: number;
  ip: number;
  waitingRoomId: number;
};

export class LogStore {
  // Columnar Storage
  public timestamps: Float64Array;
  public journeyIds: Int32Array;
  public eventIds: Uint8Array;
  public severities: Uint8Array;
  public metaIndices: Int32Array;
  public customerIds: Int32Array;
  public customerSegments: Uint8Array;
  public ips: Uint32Array;
  public waitingRoomIds: Int32Array;
  public samplingBuckets: Uint8Array;

  private head: number = 0; // Next write position
  private tail: number = 0; // Oldest unread position (if we implement full ring buffer logic)
  private length: number = 0; // Current total items (capped at MAX_LOGS)
  private totalIngested: number = 0; // Total all time
  private listeners: (() => void)[] = [];

  // Modules
  private searchEngine = new SearchEngine();
  private logStatistics = new LogStatistics();
  private tailSamplingStore = new TailSamplingStore();
  private cacheManager = new LogCacheManager(
    this.searchEngine,
    this.tailSamplingStore,
  );
  private isSimulationRunning: boolean = false;

  constructor() {
    this.timestamps = new Float64Array(MAX_LOGS);
    this.journeyIds = new Int32Array(MAX_LOGS);
    this.eventIds = new Uint8Array(MAX_LOGS);
    this.severities = new Uint8Array(MAX_LOGS);
    this.metaIndices = new Int32Array(MAX_LOGS);
    this.customerIds = new Int32Array(MAX_LOGS);
    this.customerSegments = new Uint8Array(MAX_LOGS);
    this.ips = new Uint32Array(MAX_LOGS);
    this.waitingRoomIds = new Int32Array(MAX_LOGS);
    this.samplingBuckets = new Uint8Array(MAX_LOGS);
  }

  /**
   * Add a batch of logs from the worker.
   */
  public ingestBatch(
    chunkTimestamps: Float64Array | number[],
    chunkJourneyIds: Int32Array | number[],
    chunkEventIds: Uint8Array | number[],
    chunkSeverities: Uint8Array | number[],
    chunkMetaIndices: Int32Array | number[],
    chunkCustomerIds: Int32Array | number[],
    chunkCustomerSegments: Uint8Array | number[],
    chunkIps: Uint32Array | number[],
    chunkWaitingRoomIds: Int32Array | number[],
  ) {
    const batchSize = chunkTimestamps.length;

    for (let i = 0; i < batchSize; i++) {
      const idx = (this.head + i) % MAX_LOGS;

      // Maintain stats: decrement old value if overwriting
      if (this.totalIngested + i >= MAX_LOGS) {
        this.logStatistics.decrementStats(
          this.samplingBuckets[idx],
          this.severities[idx],
          this.metaIndices[idx],
        );
      }

      this.timestamps[idx] = chunkTimestamps[i];
      this.journeyIds[idx] = chunkJourneyIds[i];
      this.eventIds[idx] = chunkEventIds[i];
      this.severities[idx] = chunkSeverities[i];
      this.metaIndices[idx] = chunkMetaIndices[i];
      this.customerIds[idx] = chunkCustomerIds[i];
      this.customerSegments[idx] = chunkCustomerSegments[i];
      this.ips[idx] = chunkIps[i];
      this.waitingRoomIds[idx] = chunkWaitingRoomIds[i];

      // Assign a random sampling bucket for visual distribution
      const bucket = (Math.random() * 100) | 0;
      this.samplingBuckets[idx] = bucket;

      this.logStatistics.incrementStats(
        bucket,
        chunkSeverities[i],
        chunkMetaIndices[i],
      );
    }

    this.head = (this.head + batchSize) % MAX_LOGS;
    this.length = Math.min(this.length + batchSize, MAX_LOGS);
    this.totalIngested += batchSize;

    this.tailSamplingStore.updateTailSampling(chunkSeverities, batchSize);

    // Update cache
    this.updateCache();

    this.notify();

    if (this.searchEngine.getQuery() && this.searchEngine.getMatchIndices()) {
      this.searchEngine.incrementalFilter(
        batchSize,
        this.length,
        (i: number) => this.getSnapshotInternal(i),
        () => this.updateCache(),
        () => this.notify(),
      );
    }
  }

  public setSimulationRunning(running: boolean) {
    if (this.isSimulationRunning === running) return;
    this.isSimulationRunning = running;
    this.notify();
  }

  public setSearchQuery(query: string) {
    this.searchEngine.setSearchQuery(query, () => {
      const keywords = this.searchEngine.getKeywords();
      if (keywords.length === 0) {
        this.updateCache();
        this.notify();
      } else {
        this.searchEngine.performSearch(
          this.length,
          (i: number) => this.getSnapshotInternal(i),
          () => this.notify(),
        );
      }
    });
  }

  private getSnapshotInternal(index: number): LogSnapshot | null {
    if (index < 0 || index >= this.length) return null;

    let physicalStart = 0;
    if (this.totalIngested > MAX_LOGS) {
      physicalStart = this.head;
    }

    const physicalIdx = (physicalStart + index) % MAX_LOGS;

    return {
      timestamp: this.timestamps[physicalIdx],
      journeyId: this.journeyIds[physicalIdx] as JourneyId,
      eventId: this.eventIds[physicalIdx] as JourneyEvent,
      severity: this.severities[physicalIdx] as LogSeverityId,
      metaIndex: this.metaIndices[physicalIdx],
      customerId: this.customerIds[physicalIdx] as CustomerId,
      customerSegment: this.customerSegments[physicalIdx],
      ip: this.ips[physicalIdx],
      waitingRoomId: this.waitingRoomIds[physicalIdx],
    };
  }

  public getSnapshotByPhysicalIndex(physicalIdx: number): LogSnapshot | null {
    if (physicalIdx < 0 || physicalIdx >= MAX_LOGS) return null;

    return {
      timestamp: this.timestamps[physicalIdx],
      journeyId: this.journeyIds[physicalIdx] as JourneyId,
      eventId: this.eventIds[physicalIdx] as JourneyEvent,
      severity: this.severities[physicalIdx] as LogSeverityId,
      metaIndex: this.metaIndices[physicalIdx],
      customerId: this.customerIds[physicalIdx] as CustomerId,
      customerSegment: this.customerSegments[physicalIdx],
      ip: this.ips[physicalIdx],
      waitingRoomId: this.waitingRoomIds[physicalIdx],
    };
  }

  public getSnapshot(index: number): LogSnapshot | null {
    const matchIndices = this.searchEngine.getMatchIndices();
    if (matchIndices) {
      const logicalIdx = matchIndices[index];
      return this.getSnapshotInternal(logicalIdx);
    }
    return this.getSnapshotInternal(index);
  }

  public getLength() {
    const matchIndices = this.searchEngine.getMatchIndices();
    if (matchIndices) {
      return matchIndices.length;
    }
    return this.length;
  }

  public getSearchStatus() {
    return this.searchEngine.getSearchStatus(this.length);
  }

  public getTotalIngested() {
    return this.totalIngested;
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) cb();
  }

  public getTailSamplingData() {
    return this.tailSamplingStore.getData();
  }

  public clear() {
    this.head = 0;
    this.tail = 0;
    this.length = 0;
    this.totalIngested = 0;

    this.searchEngine.clear();

    this.tailSamplingStore.clear();

    // Clear stats
    this.logStatistics.clear();

    this.journeyIds.fill(0);
    this.eventIds.fill(0);
    this.severities.fill(0);
    this.metaIndices.fill(0);
    this.timestamps.fill(0);
    this.customerIds.fill(0);
    this.customerSegments.fill(0);
    this.ips.fill(0);
    this.waitingRoomIds.fill(0);
    this.samplingBuckets.fill(0);
    this.notify();
  }
  private updateCache() {
    this.cacheManager.updateCache(
      this.length,
      this.totalIngested,
      this.head,
      MAX_LOGS,
      this.severities,
    );
  }

  public getFilteredCount(filters: {
    errors: boolean;
    warnings: boolean;
    slow: boolean;
    sampleInfo: boolean;
    samplingRate: number;
  }): number {
    return this.logStatistics.getFilteredCount(
      filters,
      this.getSearchStatus().isSearching,
      this.searchEngine.getMatchIndices(),
      this.totalIngested,
      this.head,
      MAX_LOGS,
      this.severities,
      this.metaIndices,
      this.samplingBuckets,
    );
  }
}

export const logStore = new LogStore();
