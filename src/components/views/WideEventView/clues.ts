import { JourneyEvent } from '../../../core/types/domain';

export type ClueId =
  | 'tls-version'
  | 'tls-cipher'
  | 'geo-country'
  | 'geo-sanctioned'
  | 'bot-score'
  | 'token-algorithm'
  | 'token-node';

export interface ClueDef {
  id: ClueId;
  step: JourneyEvent;
  fieldName: string;
  narrativeBeat: string;
  evidenceTag: string;
}

export const CLUES: ClueDef[] = [
  {
    id: 'tls-version',
    step: JourneyEvent.TLS_HANDSHAKE,
    fieldName: 'tls_version',
    narrativeBeat:
      'The handshake left an archaic fingerprint: TLS 1.0 slipped through the gate.',
    evidenceTag: 'TLS 1.0',
  },
  {
    id: 'tls-cipher',
    step: JourneyEvent.TLS_HANDSHAKE,
    fieldName: 'cipher',
    narrativeBeat:
      'A weak cipher whispers in the dark. RC4-SHA is a relic, not a safeguard.',
    evidenceTag: 'RC4-SHA',
  },
  {
    id: 'geo-country',
    step: JourneyEvent.GEO_CHECK,
    fieldName: 'country',
    narrativeBeat:
      'The trail leads east. The origin resolves to IR, not the storefront\'s usual map.',
    evidenceTag: 'IR',
  },
  {
    id: 'geo-sanctioned',
    step: JourneyEvent.GEO_CHECK,
    fieldName: 'is_sanctioned',
    narrativeBeat:
      'Sanctions are not subtle. This route is blacklisted before it reaches the vault.',
    evidenceTag: 'true',
  },
  {
    id: 'bot-score',
    step: JourneyEvent.BOT_CHECK_START,
    fieldName: 'bot_score',
    narrativeBeat:
      'The fingerprints don\'t match a human. Bot score spikes beyond the safe line.',
    evidenceTag: '0.89',
  },
  {
    id: 'token-algorithm',
    step: JourneyEvent.TOKEN_GRANT,
    fieldName: 'signing_algorithm',
    narrativeBeat:
      'The vault expects ES256. Old locks won\'t turn for modern keys.',
    evidenceTag: 'ES256',
  },
  {
    id: 'token-node',
    step: JourneyEvent.TOKEN_GRANT,
    fieldName: 'signing_node',
    narrativeBeat:
      'A single node is implicated. Token-svc-03 is always near the fracture line.',
    evidenceTag: 'token-svc-03',
  },
];

export const getClueForField = (step: JourneyEvent, fieldName: string) =>
  CLUES.find((clue) => clue.step === step && clue.fieldName === fieldName);
