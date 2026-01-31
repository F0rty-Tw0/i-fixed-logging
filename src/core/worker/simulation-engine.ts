import {
  MAX_USERS,
  CUSTOMER_ID_VIP,
  CUSTOMER_ID_STANDARD,
  WAITING_ROOM_COUNT,
  REGIONS,
  USER_AGENTS,
  STATE_INACTIVE,
  STATE_COMPLETED,
  MAX_SPAWNS_PER_TICK,
  JOURNEY_SEQUENCE,
} from '../constants';
import { JourneyEvent, LogSeverityId } from '../types/domain';

export type LogData = {
  time: number;
  journeyId: number;
  event: number;
  severity: number;
  meta: number;
  customerId: number;
  customerSegment: number;
  ip: number;
  waitingRoomId: number;
  region: number;
  userAgent: number;
};

export class SimulationEngine {
  private journeyStates = new Uint8Array(MAX_USERS).fill(STATE_INACTIVE);
  private journeySessionIds = new Int32Array(MAX_USERS);
  private journeyLastUpdateTimes = new Float64Array(MAX_USERS);
  private journeyAdvanceProbs = new Float32Array(MAX_USERS);
  private journeyCustomerIds = new Int32Array(MAX_USERS);
  private journeyIps = new Uint32Array(MAX_USERS);
  private journeyWaitingRoomIds = new Uint8Array(MAX_USERS);
  private journeyRegions = new Uint8Array(MAX_USERS);
  private journeyUserAgents = new Uint8Array(MAX_USERS);

  private globalJourneyIdCounter = 1;
  private totalOccupiedCount = 0;
  private totalRunningCount = 0;

  constructor(private pushLog: (log: LogData) => void) {}

  public tick(targetUsers: number) {
    const now = Date.now();
    let spawnsThisTick = 0;

    for (let i = 0; i < MAX_USERS; i++) {
      const state = this.journeyStates[i];

      if (state === STATE_INACTIVE) {
        if (
          this.totalOccupiedCount < targetUsers &&
          spawnsThisTick < MAX_SPAWNS_PER_TICK
        ) {
          if (Math.random() < 0.1) {
            const jitter = Math.random() * 400;
            this.startJourney(i, now + jitter);
            spawnsThisTick++;
          }
        }
      } else if (state === STATE_COMPLETED) {
        // Do nothing
      } else {
        if (Math.random() < this.journeyAdvanceProbs[i]) {
          const jitter = Math.random() * 50;
          this.advanceJourney(i, state, now + jitter);
        }
      }
    }

    return this.totalRunningCount;
  }

  private startJourney(id: number, time: number) {
    const startEvent = JOURNEY_SEQUENCE[0];
    this.journeyStates[id] = startEvent;
    this.journeySessionIds[id] = this.globalJourneyIdCounter++;
    this.journeyLastUpdateTimes[id] = time;
    this.totalOccupiedCount++;
    this.totalRunningCount++;

    const isSlow = Math.random() < 0.01;
    this.journeyAdvanceProbs[id] = isSlow ? 0.025 : 0.25;

    const isVip = Math.random() < 0.8;
    const customerId = isVip ? CUSTOMER_ID_VIP : CUSTOMER_ID_STANDARD;
    const ip = (Math.random() * 0xffffffff) >>> 0;

    const waitingRoomId = isVip
      ? Math.floor(Math.random() * (WAITING_ROOM_COUNT / 2)) + 1
      : Math.floor(Math.random() * (WAITING_ROOM_COUNT / 2)) +
        (WAITING_ROOM_COUNT / 2 + 1);

    this.journeyCustomerIds[id] = customerId;
    this.journeyIps[id] = ip;
    this.journeyWaitingRoomIds[id] = waitingRoomId;
    this.journeyRegions[id] = Math.floor(Math.random() * REGIONS.length);
    this.journeyUserAgents[id] = Math.floor(Math.random() * USER_AGENTS.length);

    this.pushLog({
      time,
      journeyId: this.journeySessionIds[id],
      event: startEvent,
      severity: LogSeverityId.INFO,
      meta: 0,
      customerId,
      customerSegment: isVip ? 1 : 0,
      ip,
      waitingRoomId,
      region: this.journeyRegions[id],
      userAgent: this.journeyUserAgents[id],
    });
  }

  private advanceJourney(id: number, currentState: number, time: number) {
    const currentIndex = currentState;
    const nextIndex = currentIndex + 1;

    const lastTime = this.journeyLastUpdateTimes[id];
    const latency = time - lastTime;
    this.journeyLastUpdateTimes[id] = time;

    const isSlow = Math.random() < 0.01;
    this.journeyAdvanceProbs[id] = isSlow ? 0.025 : 0.25;

    if (nextIndex < JOURNEY_SEQUENCE.length) {
      const nextState = JOURNEY_SEQUENCE[nextIndex];
      this.journeyStates[id] = nextState;

      let severity = LogSeverityId.INFO;
      let shouldTerminate = false;
      const rand = Math.random();

      if (latency > 1500) {
        if (rand < 0.05) {
          severity = LogSeverityId.ERROR;
          shouldTerminate = true;
        } else if (rand < 0.1) {
          severity = LogSeverityId.WARN;
        }
      } else {
        const isSecurityEvent =
          nextState === JourneyEvent.WAF_CHECK ||
          nextState === JourneyEvent.GEO_CHECK ||
          nextState === JourneyEvent.BOT_CHECK_START;

        if (isSecurityEvent && rand < 0.001) {
          severity = LogSeverityId.CRITICAL;
          shouldTerminate = true;
        } else if (rand < 0.0005) {
          severity = LogSeverityId.ERROR;
          shouldTerminate = true;
        } else if (rand < 0.003) {
          severity = LogSeverityId.WARN;
        }
      }

      this.pushLog({
        time,
        journeyId: this.journeySessionIds[id],
        event: nextState,
        severity,
        meta: latency,
        customerId: this.journeyCustomerIds[id],
        customerSegment:
          this.journeyCustomerIds[id] === CUSTOMER_ID_VIP ? 1 : 0,
        ip: this.journeyIps[id],
        waitingRoomId: this.journeyWaitingRoomIds[id],
        region: this.journeyRegions[id],
        userAgent: this.journeyUserAgents[id],
      });

      if (shouldTerminate) {
        this.journeyStates[id] = STATE_COMPLETED;
        this.totalRunningCount--;
      }
    } else {
      this.journeyStates[id] = STATE_COMPLETED;
      this.totalRunningCount--;
    }
  }

  public reset() {
    this.journeyStates.fill(STATE_INACTIVE);
    this.journeySessionIds.fill(0);
    this.journeyLastUpdateTimes.fill(0);
    this.journeyAdvanceProbs.fill(0);
    this.globalJourneyIdCounter = 1;
    this.totalOccupiedCount = 0;
    this.totalRunningCount = 0;
  }
}
