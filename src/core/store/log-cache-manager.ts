import { SearchEngine } from './search-engine';
import { TailSamplingStore } from './tail-sampling-store';

export class LogCacheManager {
  constructor(
    private searchEngine: SearchEngine,
    private tailSamplingStore: TailSamplingStore,
  ) {}

  public updateCache(
    length: number,
    totalIngested: number,
    head: number,
    MAX_LOGS: number,
    severities: Uint8Array,
  ) {
    this.tailSamplingStore.updateCache(
      !!(
        this.searchEngine.getSearchStatus(length).isSearching ||
        this.searchEngine.getQuery()
      ),
      this.searchEngine.getMatchIndices(),
      totalIngested,
      head,
      MAX_LOGS,
      severities,
    );
  }
}
