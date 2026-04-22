/**
 * Sentry alert-rule-action 이 integration webhookUrl + `/webhook` path 조합으로
 * POST 를 보냄. 같은 handler 공유 — 한 파일에서 parent route 로 delegate.
 */

export { POST, GET, dynamic, runtime } from '../route';
