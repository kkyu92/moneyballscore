/**
 * shared/db-error 의 re-export shim.
 *
 * cycle 147 review-code (heavy) — buildMatchupProfile.ts (apps/moneyball) 가
 * 같은 silent drift family detection 위해 shared 로 이전. daily.ts 의 기존
 * `./db-error` import path 보전 위해 shim 으로 유지.
 *
 * 새 호출 site 는 직접 `@moneyball/shared` 에서 import 권장.
 */

export { assertSelectOk } from '@moneyball/shared';
export type { SelectResult } from '@moneyball/shared';
