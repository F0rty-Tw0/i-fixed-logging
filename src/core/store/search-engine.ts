import { LogSnapshot } from './log-store';
import { EVENT_NAMES } from '../types/domain';
import { generateLogDetails } from '../../utils/log-details';

export interface SearchStatus {
  isSearching: boolean;
  progress: number;
  query: string;
  matchCount: number;
  isFiltered: boolean;
  disabled: boolean;
}

export class SearchEngine {
  private searchQuery = '';
  private searchKeywords: string[] = [];
  private matchIndices: Uint32Array | null = null;
  private isSearching = false;
  private searchProgress = 0;
  private currentSearchId = 0;

  setSearchQuery(query: string, onQueryChange: () => void): void {
    const trimmed = query.trim().toLowerCase();
    if (this.searchQuery === trimmed) return;

    this.searchQuery = trimmed;
    // Split by comma or space, remove empty strings
    this.searchKeywords = trimmed.split(/[\s,]+/).filter((k) => k.length > 0);
    this.currentSearchId++;

    if (this.searchKeywords.length === 0) {
      this.matchIndices = null;
      this.isSearching = false;
      this.searchProgress = 0;
    }

    onQueryChange();
  }

  matchesQuery(snap: LogSnapshot, keywords: string[]): boolean {
    if (keywords.length === 0) return true;

    const eventId = snap.eventId as keyof typeof EVENT_NAMES;
    const eventName = EVENT_NAMES[eventId].toLowerCase();
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

    return keywords.every((kw) => detailsStr.includes(kw));
  }

  public incrementalFilter(
    newCount: number,
    totalLength: number,
    getSnapshot: (i: number) => LogSnapshot | null,
    updateCache: () => void,
    notify: () => void,
  ) {
    if (!this.matchIndices) return;
    const keywords = this.searchKeywords;
    const matches: number[] = Array.from(this.matchIndices);

    // Newest logs are at the end of the logical buffer: [length - newCount, length - 1]
    const startIndex = Math.max(0, totalLength - newCount);

    for (let i = startIndex; i < totalLength; i++) {
      const snap = getSnapshot(i);
      if (snap && this.matchesQuery(snap, keywords)) {
        matches.push(i);
      }
    }

    this.matchIndices = new Uint32Array(matches);
    updateCache();
    notify();
  }

  async performSearch(
    total: number,
    getSnapshot: (i: number) => LogSnapshot | null,
    notify: () => void,
  ): Promise<void> {
    const searchId = this.currentSearchId;
    this.isSearching = true;
    this.searchProgress = 0;
    notify();

    const CHUNK_SIZE = 20000;
    const matches: number[] = [];

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      if (this.currentSearchId !== searchId) return;

      const end = Math.min(i + CHUNK_SIZE, total);

      for (let j = i; j < end; j++) {
        const snap = getSnapshot(j);
        if (snap && this.matchesQuery(snap, this.searchKeywords)) {
          matches.push(j);
        }
      }

      this.searchProgress = Math.round((end / total) * 100);
      notify();

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (this.currentSearchId === searchId) {
      this.matchIndices = new Uint32Array(matches);
      this.isSearching = false;
      notify();
    }
  }

  private cachedStatus: SearchStatus | null = null;
  private lastStatusLength = -1;

  getSearchStatus(totalLength: number): SearchStatus {
    if (
      this.cachedStatus &&
      this.lastStatusLength === totalLength &&
      this.cachedStatus.isSearching === this.isSearching &&
      this.cachedStatus.progress === this.searchProgress &&
      this.cachedStatus.query === this.searchQuery &&
      this.cachedStatus.isFiltered === (this.matchIndices !== null)
    ) {
      return this.cachedStatus;
    }

    this.lastStatusLength = totalLength;
    this.cachedStatus = {
      isSearching: this.isSearching,
      progress: this.searchProgress,
      query: this.searchQuery,
      matchCount: this.matchIndices ? this.matchIndices.length : totalLength,
      isFiltered: this.matchIndices !== null,
      disabled: false,
    };
    return this.cachedStatus;
  }

  getMatchIndices(): Uint32Array | null {
    return this.matchIndices;
  }

  setMatchIndices(indices: Uint32Array | null): void {
    this.matchIndices = indices;
  }

  clear(): void {
    this.searchQuery = '';
    this.searchKeywords = [];
    this.matchIndices = null;
    this.isSearching = false;
    this.currentSearchId++;
    this.searchProgress = 0;
  }

  getKeywords(): string[] {
    return this.searchKeywords;
  }

  getQuery(): string {
    return this.searchQuery;
  }

  getCurrentSearchId(): number {
    return this.currentSearchId;
  }
}
