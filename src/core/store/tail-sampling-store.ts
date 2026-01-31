export interface TailSamplingData {
  severities: Uint8Array;
  logIndices: Int32Array;
}

export class TailSamplingStore {
  private readonly MAX_TAIL_SAMPLES = 15000;
  private tailBuffer = new Uint8Array(15000);
  private tailCount = 0;
  private tailWriteIdx = 0;
  private tailSnapshot: Uint8Array = new Uint8Array(0);

  private cachedData: TailSamplingData = {
    severities: new Uint8Array(0),
    logIndices: new Int32Array(0),
  };

  public updateTailSampling(
    chunkSeverities: Uint8Array | number[],
    batchSize: number,
  ) {
    if (batchSize === 0) return;

    for (let i = 0; i < batchSize; i++) {
      this.tailBuffer[this.tailWriteIdx] = chunkSeverities[i];
      this.tailWriteIdx = (this.tailWriteIdx + 1) % this.MAX_TAIL_SAMPLES;
      this.tailCount = Math.min(this.tailCount + 1, this.MAX_TAIL_SAMPLES);
    }

    const snapshot = new Uint8Array(this.tailCount);
    if (this.tailCount < this.MAX_TAIL_SAMPLES) {
      snapshot.set(this.tailBuffer.subarray(0, this.tailWriteIdx));
    } else {
      const length = this.MAX_TAIL_SAMPLES;
      snapshot.set(this.tailBuffer.subarray(this.tailWriteIdx, length), 0);
      snapshot.set(
        this.tailBuffer.subarray(0, this.tailWriteIdx),
        length - this.tailWriteIdx,
      );
    }

    this.tailSnapshot = snapshot;
  }

  public getTailSnapshot() {
    return this.tailSnapshot;
  }

  public getTailCount() {
    return this.tailCount;
  }

  public getMAX_TAIL_SAMPLES() {
    return this.MAX_TAIL_SAMPLES;
  }

  public updateCache(
    isFiltered: boolean,
    matchIndices: Uint32Array | null,
    totalIngested: number,
    head: number,
    MAX_LOGS: number,
    severities: Uint8Array,
  ) {
    if (isFiltered && matchIndices) {
      const matchCount = matchIndices.length;
      const tailLen = Math.min(matchCount, this.MAX_TAIL_SAMPLES);

      const indices = new Int32Array(tailLen);
      const sevs = new Uint8Array(tailLen);

      const startOffset = matchCount - tailLen;
      const physicalStart = totalIngested > MAX_LOGS ? head : 0;

      for (let i = 0; i < tailLen; i++) {
        const logicalIdx = matchIndices[startOffset + i];
        const physicalIdx = (physicalStart + logicalIdx) % MAX_LOGS;
        indices[i] = physicalIdx;
        sevs[i] = severities[physicalIdx];
      }

      this.cachedData = { severities: sevs, logIndices: indices };
    } else {
      const count = this.tailSnapshot.length;
      let start = (head - count) % MAX_LOGS;
      if (start < 0) start += MAX_LOGS;

      const indices = new Int32Array(count);
      if (start + count <= MAX_LOGS) {
        for (let i = 0; i < count; i++) indices[i] = start + i;
      } else {
        const firstChunk = MAX_LOGS - start;
        for (let i = 0; i < firstChunk; i++) indices[i] = start + i;
        for (let i = 0; i < count - firstChunk; i++) indices[i] = i;
      }

      this.cachedData = {
        severities: this.tailSnapshot,
        logIndices: indices,
      };
    }
  }

  public getData(): TailSamplingData {
    return this.cachedData;
  }

  public clear() {
    this.tailWriteIdx = 0;
    this.tailCount = 0;
    this.tailSnapshot = new Uint8Array(0);
    this.tailBuffer.fill(0);
    this.cachedData = {
      severities: new Uint8Array(0),
      logIndices: new Int32Array(0),
    };
  }
}
