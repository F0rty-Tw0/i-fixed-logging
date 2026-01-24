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

      this.timestamps[idx] = chunkTimestamps[i];
      this.journeyIds[idx] = chunkJourneyIds[i];
      this.eventIds[idx] = chunkEventIds[i];
      this.severities[idx] = chunkSeverities[i];
      this.metaIndices[idx] = chunkMetaIndices[i];
      this.customerIds[idx] = chunkCustomerIds[i];
      this.ips[idx] = chunkIps[i];
      this.waitingRoomIds[idx] = chunkWaitingRoomIds[i];
    }

    this.head = (this.head + batchSize) % MAX_LOGS;
    this.length = Math.min(this.length + batchSize, MAX_LOGS);
    this.totalIngested += batchSize;

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
}

export const logStore = new LogStore();
