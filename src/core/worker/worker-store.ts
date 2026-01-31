import { MAX_LOGS, REGIONS, USER_AGENTS } from '../constants';
import { EVENT_NAMES, JourneyEvent } from '../types/domain';
import { generateLogDetails, getLogSource } from '../../utils/log-details';

export class WorkerLogStore {
  public timestamps: Float64Array;
  public journeyIds: Int32Array;
  public eventIds: Uint8Array;
  public severities: Uint8Array;
  public metaIndices: Int32Array;
  public customerIds: Int32Array;
  public customerSegments: Uint8Array;
  public ips: Uint32Array;
  public waitingRoomIds: Int32Array;
  public regions: Uint8Array;
  public userAgents: Uint8Array;

  private head: number = 0;
  private length: number = 0;
  private totalIngested: number = 0;

  constructor() {
    this.timestamps = new Float64Array(MAX_LOGS);
    this.journeyIds = new Int32Array(MAX_LOGS);
    this.eventIds = new Uint8Array(MAX_LOGS);
    this.severities = new Uint8Array(MAX_LOGS);
    this.metaIndices = new Int32Array(MAX_LOGS);
    this.customerIds = new Int32Array(MAX_LOGS);
    this.customerSegments = new Uint8Array(MAX_LOGS);
    this.ips = new Uint32Array(MAX_LOGS);
    this.waitingRoomIds = new Int32Array(MAX_LOGS);
    this.regions = new Uint8Array(MAX_LOGS);
    this.userAgents = new Uint8Array(MAX_LOGS);
  }

  public push(
    timestamp: number,
    journeyId: number,
    eventId: number,
    severity: number,
    metaIndex: number,
    customerId: number,
    customerSegment: number,
    ip: number,
    waitingRoomId: number,
    region: number,
    userAgent: number,
  ) {
    const idx = this.head;
    this.timestamps[idx] = timestamp;
    this.journeyIds[idx] = journeyId;
    this.eventIds[idx] = eventId;
    this.severities[idx] = severity;
    this.metaIndices[idx] = metaIndex;
    this.customerIds[idx] = customerId;
    this.customerSegments[idx] = customerSegment;
    this.ips[idx] = ip;
    this.waitingRoomIds[idx] = waitingRoomId;
    this.regions[idx] = region;
    this.userAgents[idx] = userAgent;

    this.head = (this.head + 1) % MAX_LOGS;
    this.length = Math.min(this.length + 1, MAX_LOGS);
    this.totalIngested++;
  }

  public getLength() {
    return this.length;
  }

  private getPhysicalIndex(index: number): number {
    let physicalStart = 0;
    if (this.totalIngested > MAX_LOGS) {
      physicalStart = this.head;
    }
    return (physicalStart + index) % MAX_LOGS;
  }

  public getValue(index: number, field: string): unknown {
    const pIdx = this.getPhysicalIndex(index);
    switch (field) {
      case 'timestamp':
        return this.timestamps[pIdx];
      case 'journey_id':
        return this.journeyIds[pIdx];
      case 'event':
        return EVENT_NAMES[this.eventIds[pIdx] as JourneyEvent] || 'unknown';
      case 'severity':
        return (
          ['INFO', 'WARN', 'ERROR', 'BLOCK'][this.severities[pIdx]] || 'INFO'
        );
      case 'latency':
        return this.metaIndices[pIdx];
      case 'customer_id':
        return this.customerIds[pIdx];
      case 'customer_segment':
        return this.customerSegments[pIdx] === 1 ? 'VIP' : 'STANDARD';
      case 'ip': {
        const ip = this.ips[pIdx];
        return (
          ((ip >>> 24) & 0xff) +
          '.' +
          ((ip >>> 16) & 0xff) +
          '.' +
          ((ip >>> 8) & 0xff) +
          '.' +
          (ip & 0xff)
        );
      }
      case 'waiting_room_id':
        return this.waitingRoomIds[pIdx];
      case 'region':
        return REGIONS[this.regions[pIdx]] || 'unknown';
      case 'user_agent':
        return USER_AGENTS[this.userAgents[pIdx]] || 'unknown';
      case 'message': {
        const offset =
          this.totalIngested > this.length
            ? this.totalIngested - this.length
            : 0;
        const absIndex = offset + index;
        return generateLogDetails(
          this.journeyIds[pIdx],
          this.eventIds[pIdx] as JourneyEvent,
          this.severities[pIdx],
          this.waitingRoomIds[pIdx],
          this.customerIds[pIdx],
          this.metaIndices[pIdx],
          this.ips[pIdx],
          absIndex,
        ).message;
      }
      case 'service':
        return getLogSource(this.eventIds[pIdx] as JourneyEvent);
      default:
        return null;
    }
  }

  public getRow(index: number): Record<string, unknown> {
    if (index < 0 || index >= this.length) return {};
    const pIdx = this.getPhysicalIndex(index);
    const ip = this.ips[pIdx];

    const offset =
      this.totalIngested > this.length ? this.totalIngested - this.length : 0;
    const absIndex = offset + index;

    const details = generateLogDetails(
      this.journeyIds[pIdx],
      this.eventIds[pIdx] as JourneyEvent,
      this.severities[pIdx],
      this.waitingRoomIds[pIdx],
      this.customerIds[pIdx],
      this.metaIndices[pIdx],
      this.ips[pIdx],
      absIndex,
    );

    return {
      timestamp: this.timestamps[pIdx],
      journey_id: this.journeyIds[pIdx],
      event: EVENT_NAMES[this.eventIds[pIdx] as JourneyEvent] || 'unknown',
      severity:
        ['INFO', 'WARN', 'ERROR', 'BLOCK'][this.severities[pIdx]] || 'INFO',
      latency: this.metaIndices[pIdx],
      customer_id: this.customerIds[pIdx],
      customer_segment: this.customerSegments[pIdx] === 1 ? 'VIP' : 'STANDARD',
      ip: [
        (ip >>> 24) & 0xff,
        (ip >>> 16) & 0xff,
        (ip >>> 8) & 0xff,
        ip & 0xff,
      ].join('.'),
      waiting_room_id: this.waitingRoomIds[pIdx],
      region: REGIONS[this.regions[pIdx]] || 'unknown',
      user_agent: USER_AGENTS[this.userAgents[pIdx]] || 'unknown',
      message: details.message,
      service: getLogSource(this.eventIds[pIdx] as JourneyEvent),
    };
  }

  public reset() {
    this.head = 0;
    this.length = 0;
    this.totalIngested = 0;
  }
}
