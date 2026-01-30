import { TraceSummary } from '../types/domain';

// Internal state
const summariesMap = new Map<number, TraceSummary>();

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'RESET') {
    summariesMap.clear();
    postMessage({ type: 'UPDATE', summaries: [] });
    return;
  }

  if (type === 'INGEST') {
    const {
      journeyIds,
      timestamps,
      eventIds,
      severities,
      customerSegments,
      count,
    } = payload;

    let hasChanges = false;

    for (let i = 0; i < count; i++) {
      const jId = journeyIds[i];
      const ts = timestamps[i];
      const evt = eventIds[i];
      const sev = severities[i];
      const seg = customerSegments[i];

      let summary = summariesMap.get(jId);
      if (!summary) {
        summary = {
          traceId: jId,
          startTime: ts,
          endTime: ts,
          duration: 0,
          eventCount: 0,
          maxSeverity: sev,
          lastEvent: evt,
          customerSegment: seg,
        };
        summariesMap.set(jId, summary);
      }

      summary.endTime = Math.max(summary.endTime, ts);
      summary.startTime = Math.min(summary.startTime, ts); // valid for out-of-order
      summary.duration = summary.endTime - summary.startTime;
      summary.eventCount++;
      summary.maxSeverity = Math.max(summary.maxSeverity, sev);
      // Assuming semi-chronological update for lastEvent
      if (ts >= summary.endTime) {
        summary.lastEvent = evt;
      }

      hasChanges = true;
    }

    if (hasChanges) {
      // Convert to array and sort
      // Limit to 10000 to avoid freezing the main thread with serialization of huge arrays
      const results = Array.from(summariesMap.values())
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 10000);
      postMessage({ type: 'UPDATE', summaries: results });
    }
  }
};
