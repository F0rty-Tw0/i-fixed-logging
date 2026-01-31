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
      const samplingRateLimit = filters.samplingRate;

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
        const isSlow = latency > 1000;

        // 1. Priority Bypass
        if (isError && filters.errors) {
          count++;
          continue;
        }
        if (isWarn && filters.warnings) {
          count++;
          continue;
        }
        if (isInfo && filters.sampleInfo && physicalIdx % 20 === 0) {
          count++;
          continue;
        }

        // 2. Sampled categories
        if (bucket >= samplingRateLimit) continue;

        if (filters.slow && isSlow) {
          count++;
          continue;
        }
        if (isInfo && !filters.sampleInfo) {
          count++;
          continue;
        }
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

      // 1. Errors Match
      if (filters.errors) {
        total += cntError;
      } else if (filters.slow && b < samplingLimit) {
        total += cntSlowError;
      }

      // 2. Warnings Match
      if (filters.warnings) {
        total += cntWarn;
      } else if (filters.slow && b < samplingLimit) {
        total += cntSlowWarn;
      }

      // 3. Info Match
      // Priority 5% mode (bypasses slider)
      if (filters.sampleInfo && b % 20 === 0) {
        total += cntInfo;
      }
      // Slider-based mode (Standard 100% scaled by slider or Slow scaled by slider)
      else if (b < samplingLimit) {
        if (!filters.sampleInfo) {
          total += cntInfo;
        } else if (filters.slow) {
          total += cntSlowInfo;
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
