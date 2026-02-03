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
      'Handshake negotiated TLS 1.0; ES256 signing policy requires TLS 1.2+.',
    evidenceTag: 'TLS 1.0',
  },
  {
    id: 'tls-cipher',
    step: JourneyEvent.TLS_HANDSHAKE,
    fieldName: 'cipher',
    narrativeBeat:
      'Legacy cipher suite selected under TLS 1.0; modern signing policy rejects it.',
    evidenceTag: 'RC4-SHA',
  },
  {
    id: 'geo-country',
    step: JourneyEvent.GEO_CHECK,
    fieldName: 'country',
    narrativeBeat:
      'Geo lookup resolves the origin to IR (Iran).',
    evidenceTag: 'IR',
  },
  {
    id: 'geo-sanctioned',
    step: JourneyEvent.GEO_CHECK,
    fieldName: 'is_sanctioned',
    narrativeBeat:
      'Origin is in a sanctioned region; compliance policy blocks token issuance.',
    evidenceTag: 'true',
  },
  {
    id: 'bot-score',
    step: JourneyEvent.BOT_CHECK_START,
    fieldName: 'bot_score',
    narrativeBeat:
      'Risk engine flagged elevated automation, but compliance + TLS policy is decisive.',
    evidenceTag: '0.89',
  },
  {
    id: 'token-algorithm',
    step: JourneyEvent.TOKEN_GRANT,
    fieldName: 'signing_algorithm',
    narrativeBeat:
      'Token signing enforces ES256, which requires TLS 1.2+ during the handshake.',
    evidenceTag: 'ES256',
  },
  {
    id: 'token-node',
    step: JourneyEvent.TOKEN_GRANT,
    fieldName: 'signing_node',
    narrativeBeat:
      'Signer logged policy rejection: tls_version < 1.2 with ES256 required.',
    evidenceTag: 'token-svc-03',
  },
];

export const getClueForField = (step: JourneyEvent, fieldName: string) =>
  CLUES.find((clue) => clue.step === step && clue.fieldName === fieldName);
