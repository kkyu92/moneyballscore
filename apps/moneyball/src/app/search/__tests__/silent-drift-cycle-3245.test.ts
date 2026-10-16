import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 3245 review-code(heavy): buildSearchIndex 의 players/dates DB 조회는 try/catch 로
// assertSelectOk 예외를 흡수해 Sentry 에만 기록하고 빈 섹션으로 조용히 넘어간다 (fail-silent) —
// 하지만 page.tsx 의 comment(commit be0a43f9, cycle 3045)는 이를 "fail-loud" 라 잘못 명시했고,
// dbDegraded 파생값은 playerHitsR/dateHitsR(쿼리 ?q= 전용 경로)만 보고 buildSearchIndex 자체의
// DB 실패는 반영하지 않았다 — 즉 ?q= 없이 접속 시 플레이어/날짜 인덱스가 DB 장애로 통째로 비어도
// "일시적인 서비스 장애" 배너가 뜨지 않음. buildSearchIndex 가 { entries, degraded } 를 반환하고
// degraded 를 dbDegraded 파생에 합류시키도록 수정.

const pageSrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 3245 — buildSearchIndex DB 실패가 dbDegraded 배너에 반영 안 됨', () => {
  it('buildSearchIndex 는 { entries, degraded } shape 반환', () => {
    expect(pageSrc).toContain('async function buildSearchIndex(): Promise<{ entries: SearchEntry[]; degraded: boolean }>');
    expect(pageSrc).toContain('return { entries, degraded };');
  });

  it('players/dates catch 블록이 degraded = true 를 설정', () => {
    const playersCatch = pageSrc.indexOf("op: 'build-index-players'");
    const datesCatch = pageSrc.indexOf("op: 'build-index-dates'");
    expect(playersCatch).toBeGreaterThan(-1);
    expect(datesCatch).toBeGreaterThan(-1);
    const beforePlayersCatch = pageSrc.slice(0, playersCatch);
    const beforeDatesCatch = pageSrc.slice(0, datesCatch);
    expect(beforePlayersCatch.lastIndexOf('degraded = true;')).toBeGreaterThan(beforePlayersCatch.lastIndexOf('op: \'build-index-dates\''));
    expect(beforeDatesCatch.lastIndexOf('degraded = true;')).toBeGreaterThan(beforeDatesCatch.lastIndexOf('op: \'build-index-players\''));
  });

  it('dbDegraded 파생값이 searchIndexDegraded 를 포함', () => {
    expect(pageSrc).toContain('const { entries: searchIndex, degraded: searchIndexDegraded } = await searchIndexPromise;');
    expect(pageSrc).toContain('const dbDegraded = searchIndexDegraded || [playerHitsR, dateHitsR].some((r) => r.status === "rejected");');
  });

  it('comment 가 더 이상 fail-loud 로 잘못 주장하지 않음', () => {
    expect(pageSrc).not.toContain('fail-loud');
  });
});
