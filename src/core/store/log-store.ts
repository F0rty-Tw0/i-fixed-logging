import {
  MAX_LOGS,
  JourneyEvent,
  LogSeverityId,
  EVENT_NAMES,
} from '../types/domain';
import { generateLogDetails } from '../../utils/log-details';

export type LogSnapshot = {
  timestamp: number;
  journeyId: number;
  eventId: JourneyEvent;
  severity: LogSeverityId;
  metaIndex: number;
  customerId: number;
  ip: number;
  waitingRoomId: number;
};

class LogStore {
  // Columnar Storage
  public timestamps: Float64Array;
  public journeyIds: Int32Array;
  public eventIds: Uint8Array;
  public severities: Uint8Array;
  public metaIndices: Int32Array;
  public customerIds: Int32Array;
  public ips: Uint32Array;
  public waitingRoomIds: Int32Array;

  private head: number = 0; // Next write position
  private tail: number = 0; // Oldest unread position (if we implement full ring buffer logic)
  private length: number = 0; // Current total items (capped at MAX_LOGS)
  private totalIngested: number = 0; // Total all time
  private listeners: (() => void)[] = [];

  // Search state
  private searchQuery: string = '';
  private searchKeywords: string[] = [];
  private filteredIndices: Uint32Array | null = null;
  private isSearching: boolean = false;
  private searchProgress: number = 0;
  private currentSearchId: number = 0;
  private isSimulationRunning: boolean = false;
  private _cachedSearchStatus = {
    isSearching: false,
    progress: 0,
    query: '',
    matchCount: 0,
    isFiltered: false,
    disabled: false,
  };

  // Tail Sampling state (dense sequential circular buffer)
  private readonly MAX_TAIL_SAMPLES = 15000; // 1000 columns * 15 rows
  private tailBuffer = new Uint8Array(15000);
  private tailCount = 0;
  private tailWriteIdx = 0;
  private tailSnapshot: Uint8Array = new Uint8Array(0);

  private _cachedTailSamplingData: {
    severities: Uint8Array;
    logIndices: Int32Array;
  } = {
    severities: new Uint8Array(0),
    logIndices: new Int32Array(0),
  };

  constructor() {
    this.timestamps = new Float64Array(MAX_LOGS);
    this.journeyIds = new Int32Array(MAX_LOGS);
    this.eventIds = new Uint8Array(MAX_LOGS);
    this.severities = new Uint8Array(MAX_LOGS);
    this.metaIndices = new Int32Array(MAX_LOGS);
    this.customerIds = new Int32Array(MAX_LOGS);
    this.ips = new Uint32Array(MAX_LOGS);
    this.waitingRoomIds = new Int32Array(MAX_LOGS);
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
    chunkIps: Uint32Array | number[],
    chunkWaitingRoomIds: Int32Array | number[],
  ) {
    const batchSize = chunkTimestamps.length;

    for (let i = 0; i < batchSize; i++) {
      const idx = (this.head + i) % MAX_LOGS;

      // Maintain stats: decrement old value if overwriting
      if (this.length === MAX_LOGS || this.totalIngested + i >= MAX_LOGS) {
        // Note: If totalIngested < MAX_LOGS, we are filling initializing.
        // If length == MAX_LOGS, we are overwriting.
        // Actually, wait: If totalIngested < MAX_LOGS, we are writing to virgin memory (0).
        // If totalIngested > MAX_LOGS, we are overwriting.
        // But `this.length` caps at MAX_LOGS.
        // So if `this.length === MAX_LOGS`, we are overwriting.
        // EXCEPT: Is it possible `this.length` is MAX_LOGS but we haven't wrapped yet?
        // No, length only hits MAX_LOGS when full.
        // Safe check: `if (this.totalIngested >= MAX_LOGS)` or check if severities[idx] has meaningful data?
        // Actually `this.severities` is initialized to 0. Type 0 is likely existing.
        // Safer: `if (this.length === MAX_LOGS)`
        if (this.length === MAX_LOGS) {
          this.decrementStats(idx);
        }
      }

      this.timestamps[idx] = chunkTimestamps[i];
      this.journeyIds[idx] = chunkJourneyIds[i];
      this.eventIds[idx] = chunkEventIds[i];
      this.severities[idx] = chunkSeverities[i];
      this.metaIndices[idx] = chunkMetaIndices[i];
      this.customerIds[idx] = chunkCustomerIds[i];
      this.ips[idx] = chunkIps[i];
      this.waitingRoomIds[idx] = chunkWaitingRoomIds[i];

      this.incrementStats(idx, chunkSeverities[i], chunkMetaIndices[i]);
    }

    this.head = (this.head + batchSize) % MAX_LOGS;
    this.length = Math.min(this.length + batchSize, MAX_LOGS);
    this.totalIngested += batchSize;

    this.updateTailSampling(chunkSeverities, chunkJourneyIds, batchSize);

    // Update cache
    this.updateCache();

    this.notify();

    // If we have a filter active, incrementally append new matches
    if (this.searchQuery && this.filteredIndices) {
      this.incrementalFilter(batchSize);
    }
  }

  private incrementalFilter(newCount: number) {
    const keywords = this.searchKeywords;
    const matches: number[] = Array.from(this.filteredIndices!);

    // Newest logs are at the end of the logical buffer: [length - newCount, length - 1]
    const startIndex = Math.max(0, this.length - newCount);

    for (let i = startIndex; i < this.length; i++) {
      const snap = this.getSnapshotInternal(i);
      if (snap && this.matchesQuery(snap, keywords)) {
        matches.push(i);
      }
    }

    this.filteredIndices = new Uint32Array(matches);
    this.updateCache();
    this.notify();
  }

  private matchesQuery(snap: LogSnapshot, keywords: string[]): boolean {
    const eventName = EVENT_NAMES[snap.eventId].toLowerCase();
    const severityStr = ['info', 'warn', 'error', 'block'][snap.severity];
    const journeyIdStr = `#${snap.journeyId}`.toLowerCase();
    const customerIdStr = `c-${snap.customerId}`.toLowerCase();

    const formattedIp = [
      (snap.ip >>> 24) & 0xff,
      (snap.ip >>> 16) & 0xff,
      (snap.ip >>> 8) & 0xff,
      snap.ip & 0xff,
    ].join('.');

    for (const kw of keywords) {
      if (
        journeyIdStr.includes(kw) ||
        eventName.includes(kw) ||
        severityStr.includes(kw) ||
        customerIdStr.includes(kw) ||
        formattedIp.includes(kw)
      ) {
        return true;
      }
    }

    const details = generateLogDetails(
      snap.journeyId,
      snap.eventId,
      snap.severity,
      snap.waitingRoomId,
      snap.customerId,
      snap.metaIndex,
      snap.ip,
    );
    const detailsStr = JSON.stringify(details).toLowerCase();

    for (const kw of keywords) {
      if (detailsStr.includes(kw)) {
        return true;
      }
    }

    return false;
  }

  public setSimulationRunning(running: boolean) {
    if (this.isSimulationRunning === running) return;
    this.isSimulationRunning = running;
    this.notify();
  }

  public setSearchQuery(query: string) {
    const trimmed = query.trim().toLowerCase();
    if (this.searchQuery === trimmed) return;

    this.searchQuery = trimmed;
    // Split by comma or space, remove empty strings
    this.searchKeywords = trimmed.split(/[\s,]+/).filter((k) => k.length > 0);
    this.currentSearchId++;

    if (this.searchKeywords.length === 0) {
      this.filteredIndices = null;
      this.isSearching = false;
      this.searchProgress = 0;
      this.updateCache();
      this.notify();
      return;
    }

    this.performSearch(this.searchKeywords);
  }

  private async performSearch(keywords: string[]) {
    const searchId = this.currentSearchId;
    this.isSearching = true;
    this.searchProgress = 0;
    this.notify();

    const CHUNK_SIZE = 20000;
    const total = this.length;
    const matches: number[] = [];

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      if (this.currentSearchId !== searchId) return;

      const end = Math.min(i + CHUNK_SIZE, total);

      for (let j = i; j < end; j++) {
        const snap = this.getSnapshotInternal(j);
        if (snap && this.matchesQuery(snap, keywords)) {
          matches.push(j);
        }
      }

      this.searchProgress = Math.round((end / total) * 100);
      this.notify();

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (this.currentSearchId === searchId) {
      this.filteredIndices = new Uint32Array(matches);
      this.isSearching = false;
      this.updateCache();
      this.notify();
    }
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
      journeyId: this.journeyIds[physicalIdx],
      eventId: this.eventIds[physicalIdx] as JourneyEvent,
      severity: this.severities[physicalIdx] as LogSeverityId,
      metaIndex: this.metaIndices[physicalIdx],
      customerId: this.customerIds[physicalIdx],
      ip: this.ips[physicalIdx],
      waitingRoomId: this.waitingRoomIds[physicalIdx],
    };
  }

  public getSnapshotByPhysicalIndex(physicalIdx: number): LogSnapshot | null {
    if (physicalIdx < 0 || physicalIdx >= MAX_LOGS) return null;

    return {
      timestamp: this.timestamps[physicalIdx],
      journeyId: this.journeyIds[physicalIdx],
      eventId: this.eventIds[physicalIdx] as JourneyEvent,
      severity: this.severities[physicalIdx] as LogSeverityId,
      metaIndex: this.metaIndices[physicalIdx],
      customerId: this.customerIds[physicalIdx],
      ip: this.ips[physicalIdx],
      waitingRoomId: this.waitingRoomIds[physicalIdx],
    };
  }

  public getSnapshot(index: number): LogSnapshot | null {
    if (this.filteredIndices) {
      const logicalIdx = this.filteredIndices[index];
      return this.getSnapshotInternal(logicalIdx);
    }
    return this.getSnapshotInternal(index);
  }

  public getLength() {
    if (this.filteredIndices) {
      return this.filteredIndices.length;
    }
    return this.length;
  }

  public getSearchStatus() {
    return this._cachedSearchStatus;
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
    this._cachedSearchStatus = {
      isSearching: this.isSearching,
      progress: this.searchProgress,
      query: this.searchQuery,
      matchCount: this.filteredIndices
        ? this.filteredIndices.length
        : this.length,
      isFiltered: this.filteredIndices !== null,
      disabled: false, // Re-enable UI during simulation
    };

    for (const cb of this.listeners) cb();
  }

  private updateTailSampling(
    chunkSeverities: Uint8Array | number[],
    chunkJourneyIds: Int32Array | number[],
    batchSize: number,
  ) {
    if (batchSize === 0) return;

    // Just push into the circular buffer sequentially
    for (let i = 0; i < batchSize; i++) {
      this.tailBuffer[this.tailWriteIdx] = chunkSeverities[i];
      this.tailWriteIdx = (this.tailWriteIdx + 1) % this.MAX_TAIL_SAMPLES;
      this.tailCount = Math.min(this.tailCount + 1, this.MAX_TAIL_SAMPLES);
    }

    // Create a logical snapshot: chronological from oldest to newest
    const snapshot = new Uint8Array(this.tailCount);

    if (this.tailCount < this.MAX_TAIL_SAMPLES) {
      // Not wrapped yet: [0, tailWriteIdx-1]
      snapshot.set(this.tailBuffer.subarray(0, this.tailWriteIdx));
    } else {
      // Wrapped: [tailWriteIdx, MAX-1] then [0, tailWriteIdx-1]
      const length = this.MAX_TAIL_SAMPLES;
      snapshot.set(this.tailBuffer.subarray(this.tailWriteIdx, length), 0);
      snapshot.set(
        this.tailBuffer.subarray(0, this.tailWriteIdx),
        length - this.tailWriteIdx,
      );
    }

    this.tailSnapshot = snapshot;
  }

  public getTailSamplingData() {
    return this._cachedTailSamplingData;
  }

  public clear() {
    this.head = 0;
    this.tail = 0;
    this.length = 0;
    this.totalIngested = 0;

    this.searchQuery = '';
    this.searchKeywords = [];
    this.filteredIndices = null;
    this.isSearching = false;
    this.currentSearchId++;

    // Clear tail sampling
    this.tailWriteIdx = 0;
    this.tailCount = 0;
    this.tailSnapshot = new Uint8Array(0);
    this.tailBuffer.fill(0);

    // Reset cache
    this._cachedTailSamplingData = {
      severities: new Uint8Array(0),
      logIndices: new Int32Array(0),
    };

    this.journeyIds.fill(0);
    this.eventIds.fill(0);
    this.severities.fill(0);
    this.metaIndices.fill(0);
    this.timestamps.fill(0);
    this.customerIds.fill(0);
    this.ips.fill(0);
    this.waitingRoomIds.fill(0);
    this.notify();
  }
  private updateCache() {
    if ((this.isSearching || this.searchQuery) && this.filteredIndices) {
      // Filtered mode
      const matchCount = this.filteredIndices.length;
      const tailLen = Math.min(matchCount, this.MAX_TAIL_SAMPLES);

      const indices = new Int32Array(tailLen);
      const severities = new Uint8Array(tailLen);

      // filteredIndices contains logical indices [0..length]
      // We want the LAST tailLen entries.
      const startOffset = matchCount - tailLen;

      // We need to convert logical filter indices to physical indices
      // Logical 0 corresponds to physical start.
      let physicalStart = 0;
      if (this.totalIngested > MAX_LOGS) {
        physicalStart = this.head;
      }

      for (let i = 0; i < tailLen; i++) {
        const logicalIdx = this.filteredIndices[startOffset + i];
        const physicalIdx = (physicalStart + logicalIdx) % MAX_LOGS;
        indices[i] = physicalIdx;
        severities[i] = this.severities[physicalIdx];
      }

      this._cachedTailSamplingData = { severities, logIndices: indices };
    } else {
      // Raw mode
      // Re-use tailSnapshot which is computed in updateTailSampling
      // I need to generate indices.
      const count = this.tailSnapshot.length;
      let start = (this.head - count) % MAX_LOGS;
      if (start < 0) start += MAX_LOGS;

      const indices = new Int32Array(count);
      if (start + count <= MAX_LOGS) {
        // Continuous
        for (let i = 0; i < count; i++) indices[i] = start + i;
      } else {
        // Wrapped
        const firstChunk = MAX_LOGS - start;
        for (let i = 0; i < firstChunk; i++) indices[i] = start + i;
        for (let i = 0; i < count - firstChunk; i++) indices[i] = i;
      }

      this._cachedTailSamplingData = {
        severities: this.tailSnapshot,
        logIndices: indices,
      };
    }
  }

  // Statistics for O(1) filtered counts
  private statsColumns = {
    error: new Int32Array(100),
    warn: new Int32Array(100),
    info: new Int32Array(100),
    slowError: new Int32Array(100),
    slowWarn: new Int32Array(100),
    slowInfo: new Int32Array(100),
  };

  private decrementStats(physicalIdx: number) {
    const bucket = physicalIdx % 100;
    const sev = this.severities[physicalIdx];
    const latency = this.metaIndices[physicalIdx];
    const isSlow = latency > 1000;

    const isError =
      sev === LogSeverityId.CRITICAL || sev === LogSeverityId.ERROR;
    const isWarn = sev === LogSeverityId.WARN;
    const isInfo = sev === LogSeverityId.INFO;

    if (isError) {
      this.statsColumns.error[bucket]--;
      if (isSlow) this.statsColumns.slowError[bucket]--;
    } else if (isWarn) {
      this.statsColumns.warn[bucket]--;
      if (isSlow) this.statsColumns.slowWarn[bucket]--;
    } else if (isInfo) {
      this.statsColumns.info[bucket]--;
      if (isSlow) this.statsColumns.slowInfo[bucket]--;
    }
  }

  private incrementStats(physicalIdx: number, sev: number, latency: number) {
    const bucket = physicalIdx % 100;
    const isSlow = latency > 1000;

    const isError =
      sev === LogSeverityId.CRITICAL || sev === LogSeverityId.ERROR;
    const isWarn = sev === LogSeverityId.WARN;
    const isInfo = sev === LogSeverityId.INFO;

    if (isError) {
      this.statsColumns.error[bucket]++;
      if (isSlow) this.statsColumns.slowError[bucket]++;
    } else if (isWarn) {
      this.statsColumns.warn[bucket]++;
      if (isSlow) this.statsColumns.slowWarn[bucket]++;
    } else if (isInfo) {
      this.statsColumns.info[bucket]++;
      if (isSlow) this.statsColumns.slowInfo[bucket]++;
    }
  }

  public getFilteredCount(filters: {
    errors: boolean;
    warnings: boolean;
    slow: boolean;
    sampleInfo: boolean;
    samplingRate: number;
  }): number {
    // If searching, we must fallback to scanning the filteredIndices because stats are global
    if ((this.isSearching || this.searchQuery) && this.filteredIndices) {
      let count = 0;
      const len = this.filteredIndices.length;

      let physicalStart = 0;
      if (this.totalIngested > MAX_LOGS) {
        physicalStart = this.head;
      }

      for (let i = 0; i < len; i++) {
        const logicalIdx = this.filteredIndices[i];
        const physicalIdx = (physicalStart + logicalIdx) % MAX_LOGS;

        const sev = this.severities[physicalIdx];
        const latency = this.metaIndices[physicalIdx];

        // Check sampling first (mimic view logic: bucket check)
        const bucket = physicalIdx % 100;
        if (bucket >= filters.samplingRate) continue;

        const isError =
          sev === LogSeverityId.CRITICAL || sev === LogSeverityId.ERROR;
        const isWarn = sev === LogSeverityId.WARN;
        const isInfo = sev === LogSeverityId.INFO;

        let isVisible = false;
        if (isError && filters.errors) isVisible = true;
        if (isWarn && filters.warnings) isVisible = true;
        if (filters.slow && latency > 1000) isVisible = true;

        if (isInfo) {
          // View Logic for Info:
          // if (!filters.sampleInfo) -> Show All (isVisible = true)
          // else if (physicalIdx % 20 === 0) -> Show Sampled
          // Note: Slow filter overrides this in current View Logic?
          // View: if (slow) { isVisible = true } ... if (isInfo) { check sample }
          // If slow made it visible, it stays visible.
          // If not slow, we check info logic.

          if (!isVisible) {
            if (!filters.sampleInfo) isVisible = true;
            else if (physicalIdx % 20 === 0) isVisible = true;
          }
        }

        if (isVisible) count++;
      }
      return count;
    }

    // Fast Path: Use O(1) Precomputed Stats
    let total = 0;

    // Sum up buckets from 0 to samplingRate - 1
    // (Buckets >= samplingRate are excluded by strict sampling logic)
    const limit = Math.min(100, Math.max(0, filters.samplingRate));

    for (let b = 0; b < limit; b++) {
      const cntError = this.statsColumns.error[b];
      const cntWarn = this.statsColumns.warn[b];
      const cntInfo = this.statsColumns.info[b];
      const cntSlowError = this.statsColumns.slowError[b];
      const cntSlowWarn = this.statsColumns.slowWarn[b];
      const cntSlowInfo = this.statsColumns.slowInfo[b];

      const nInfoFast = cntInfo - cntSlowInfo;

      // Logic:
      // Error is visible if (filters.errors OR (filters.slow AND isSlow))
      // Warn is visible if (filters.warnings OR (filters.slow AND isSlow))
      // Info:
      //  If Slow Info: visible if (filters.slow OR InfoLogic)
      //  If Fast Info: visible if (InfoLogic)

      // InfoLogic: (!filters.sampleInfo) OR (bucket % 20 === 0)
      // Note: b is bucket.
      const infoPos = !filters.sampleInfo || b % 20 === 0;

      // Errors
      if (filters.errors) {
        total += cntError; // Both fast and slow shown
      } else if (filters.slow) {
        total += cntSlowError; // Only slow errors shown
      }

      // Warnings
      if (filters.warnings) {
        total += cntWarn;
      } else if (filters.slow) {
        total += cntSlowWarn;
      }

      // Info
      // Fast Info
      if (infoPos) {
        total += nInfoFast;
      }

      // Slow Info
      if (filters.slow || infoPos) {
        total += cntSlowInfo;
      }
    }

    return total;
  }
}

export const logStore = new LogStore();
