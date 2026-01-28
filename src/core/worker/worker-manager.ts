export type WorkerMessage = {
  type: string;
  payload?: unknown;
};

class WorkerManager {
  private worker: Worker | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  public getWorker(): Worker | null {
    if (typeof window === 'undefined') return null;
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../worker/simulation.worker.ts', import.meta.url),
      );
      this.worker.onmessage = (e) => this.handleMessage(e);
    }
    return this.worker;
  }

  private handleMessage(e: MessageEvent) {
    const { type, payload } = e.data;
    const typeSet = this.listeners.get(type);
    if (typeSet) {
      typeSet.forEach((cb) => cb(payload));
    }
  }

  public subscribe<T = unknown>(type: string, cb: (data: T) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(cb as (data: unknown) => void);
    return () => {
      this.listeners.get(type)?.delete(cb as (data: unknown) => void);
    };
  }

  public postMessage(msg: WorkerMessage) {
    const worker = this.getWorker();
    if (worker) {
      worker.postMessage(msg);
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const workerManager = new WorkerManager();
