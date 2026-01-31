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

        const isError =
          sev === LogSeverityId.CRITICAL || sev === LogSeverityId.ERROR;
        const isWarn = sev === LogSeverityId.WARN;
        const isInfo = sev === LogSeverityId.INFO;

        // Priority Bypass
        if (isError && filters.errors) {
          count++;
          continue;
        }
        if (isWarn && filters.warnings) {
          count++;
          continue;
        }

        // Sampling applies to the rest
        if (bucket >= filters.samplingRate) continue;

        let visible = false;
        if (filters.slow && latency > 1000) visible = true;
        if (filters.sampleInfo && isInfo && physicalIdx % 20 === 0)
          visible = true;

        if (visible) count++;
      }
      return count;
    }

    // Fast Path: Use O(1) Precomputed Stats
    let total = 0;
    const samplingLimit = Math.min(100, Math.max(0, filters.samplingRate));

    for (let b = 0; b < 100; b++) {
      const cntError = this.statsColumns.error[b];
      const cntWarn = this.statsColumns.warn[b];
      const cntInfo = this.statsColumns.info[b];
      const cntSlowInfo = this.statsColumns.slowInfo[b];
      const cntSlowWarn = this.statsColumns.slowWarn[b];
      const cntSlowError = this.statsColumns.slowError[b];

      // 1. Priority logs: always added regardless of bucket if filter is ON
      if (filters.errors) {
        total += cntError;
      }
      if (filters.warnings) {
        total += cntWarn;
      }

      // 2. Sampled logs: only added if bucket is within sampling limit
      if (b < samplingLimit) {
        // Slow logs that were NOT errors or warnings (already counted or bypassed)
        if (filters.slow) {
          if (!filters.errors) total += cntSlowError;
          if (!filters.warnings) total += cntSlowWarn;
          total += cntSlowInfo;
        }

        // Info logs (sampled at 5%)
        // Note: b % 20 === 0 is not quite the same as physicalIdx % 20,
        // but since buckets are random, it's roughly the same statistical distribution for the count.
        // Actually, for an exact count we'd need to check physicalIdx.
        // But for "Fast Path" we use probability. 5% of Info logs.
        if (filters.sampleInfo) {
          // Add 1/20th of non-slow info logs (to avoid double counting slow info)
          const nonSlowInfo = cntInfo - cntSlowInfo;
          // Statistically we take 5%. Since buckets are random, we can just take every 20th bucket's full count.
          if (b % 20 === 0) {
            total += nonSlowInfo;
          }
        }
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
