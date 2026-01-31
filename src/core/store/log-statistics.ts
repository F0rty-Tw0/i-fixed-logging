import { LogSeverityId } from '../types/domain';

export class LogStatistics {
  private statsColumns = {
    error: new Int32Array(100),
    warn: new Int32Array(100),
    info: new Int32Array(100),
    slowError: new Int32Array(100),
    slowWarn: new Int32Array(100),
    slowInfo: new Int32Array(100),
  };

  public decrementStats(bucket: number, sev: number, latency: number) {
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

  public incrementStats(bucket: number, sev: number, latency: number) {
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

  public getFilteredCount(
    filters: {
      errors: boolean;
      warnings: boolean;
      slow: boolean;
      sampleInfo: boolean;
      samplingRate: number;
    },
    isSearching: boolean,
    matchIndices: Uint32Array | null,
    totalIngested: number,
    head: number,
    MAX_LOGS: number,
    severities: Uint8Array,
    metaIndices: Int32Array,
    samplingBuckets: Uint8Array,
  ): number {
    if (isSearching) {
      return -1;
    }

    if (matchIndices) {
      // If we have a query but no filter indices, return 0
      if (matchIndices.length === 0) return 0;

      let count = 0;
      const len = matchIndices.length;
      const physicalStart = totalIngested > MAX_LOGS ? head : 0;

      for (let i = 0; i < len; i++) {
        const logicalIdx = matchIndices[i];
        const physicalIdx = (physicalStart + logicalIdx) % MAX_LOGS;

        const sev = severities[physicalIdx];
        const latency = metaIndices[physicalIdx];
        const bucket = samplingBuckets[physicalIdx];

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
    const limit = Math.min(100, Math.max(0, filters.samplingRate));

    for (let b = 0; b < limit; b++) {
      const cntError = this.statsColumns.error[b];
      const cntWarn = this.statsColumns.warn[b];
      const cntInfo = this.statsColumns.info[b];
      const cntSlowError = this.statsColumns.slowError[b];
      const cntSlowWarn = this.statsColumns.slowWarn[b];
      const cntSlowInfo = this.statsColumns.slowInfo[b];

      const nInfoFast = cntInfo - cntSlowInfo;
      const infoPos = !filters.sampleInfo || b % 20 === 0;

      if (filters.errors) {
        total += cntError;
      } else if (filters.slow) {
        total += cntSlowError;
      }

      if (filters.warnings) {
        total += cntWarn;
      } else if (filters.slow) {
        total += cntSlowWarn;
      }

      if (infoPos) {
        total += nInfoFast;
      }

      if (filters.slow || infoPos) {
        total += cntSlowInfo;
      }
    }

    return total;
  }

  public clear() {
    this.statsColumns.error.fill(0);
    this.statsColumns.warn.fill(0);
    this.statsColumns.info.fill(0);
    this.statsColumns.slowError.fill(0);
    this.statsColumns.slowWarn.fill(0);
    this.statsColumns.slowInfo.fill(0);
  }
}
