#!/usr/bin/env tsx
/**
 * 로또 6/45 패턴 분석 + 1등 번호 추천
 *
 * 사용법:
 *   npx tsx scripts/lotto.ts fetch        # 전회차 데이터 수집
 *   npx tsx scripts/lotto.ts update       # 최신 회차 추가 + 규칙 자가검증
 *   npx tsx scripts/lotto.ts analyze      # 현재 100% 규칙 출력
 *   npx tsx scripts/lotto.ts rules        # 규칙 테이블만 간단 출력
 *   npx tsx scripts/lotto.ts pick [N]     # 추천 N세트 (기본 5)
 *   npx tsx scripts/lotto.ts              # fetch → analyze → pick
 *
 * 원칙: 100% 성립하지 않는 패턴은 필터에서 제외.
 * 규칙은 데이터 기반 동적 계산 — 하드코딩 없음.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(__dirname, 'lotto-data.json');
const FETCH_DELAY_MS = 300;

const CSV_URL =
  'https://raw.githubusercontent.com/godmode2k/lotto645/main/' +
  'lotto645_%EB%8B%B9%EC%B2%A8%EB%B2%88%ED%98%B81205%ED%9A%8C%EC%B0%A8%EA%B9%8C%EC%A7%80.csv';

interface LottoRound {
  round: number;
  date: string;
  numbers: number[];
  bonus: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  fields.push(cur.trim());
  return fields;
}

// ─── FETCH ───────────────────────────────────────────────────────────────────

async function fetchFromCSV(): Promise<LottoRound[]> {
  console.log('  GitHub CSV 다운로드 중 (1~1205회차)...');
  const res = await fetch(CSV_URL, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`CSV 실패: ${res.status}`);
  const text = await res.text();
  const rounds: LottoRound[] = [];
  for (const line of text.trim().split('\n').slice(1)) {
    if (!line.trim()) continue;
    const f = parseCSVLine(line);
    if (f.length < 9) continue;
    const round = Number(f[1].replace(/,/g, ''));
    if (!round || isNaN(round)) continue;
    const numbers = [f[2],f[3],f[4],f[5],f[6],f[7]].map(Number).sort((a,b)=>a-b);
    const bonus = Number(f[8]);
    if (numbers.some(n => isNaN(n) || n < 1 || n > 45) || isNaN(bonus)) continue;
    rounds.push({ round, date: '', numbers, bonus });
  }
  rounds.sort((a, b) => a.round - b.round);
  console.log(`  CSV 파싱 완료: ${rounds.length}회차`);
  return rounds;
}

async function fetchRoundFromAPI(round: number): Promise<LottoRound | null> {
  const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const data = await res.json() as Record<string, unknown>;
    if (data['returnValue'] !== 'success') return null;
    const numbers = [
      data['drwtNo1'], data['drwtNo2'], data['drwtNo3'],
      data['drwtNo4'], data['drwtNo5'], data['drwtNo6'],
    ].map(Number).sort((a, b) => a - b);
    return { round, date: String(data['drwNoDate']), numbers, bonus: Number(data['bnusNo']) };
  } catch { return null; }
}

async function fetchFromLottolyzer(neededRounds: Set<number>): Promise<LottoRound[]> {
  const results: LottoRound[] = [];
  let page = 1;
  while (neededRounds.size > 0) {
    const url = `https://en.lottolyzer.com/history/south-korea/6_slash_45-lotto/page/${page}/per-page/100`;
    let html: string;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      html = await res.text();
    } catch { console.warn(`  lottolyzer 페이지 ${page} 실패`); break; }

    const rowRe = /<td>(\d+)<\/td>\s*<td class="sum-p1">(\d{4}-\d{2}-\d{2})<\/td>\s*<td class="sum-p1">([\d,\s]+?)<\/td>\s*<td class="sum-p1">\s*(\d+)\s*<\/td>/g;
    let m: RegExpExecArray | null;
    let found = 0;
    while ((m = rowRe.exec(html)) !== null) {
      const round = Number(m[1]);
      if (!neededRounds.has(round)) continue;
      const numbers = m[3].split(',').map(s => Number(s.trim())).sort((a,b)=>a-b);
      const bonus = Number(m[4]);
      if (numbers.length !== 6 || numbers.some(n => n < 1 || n > 45)) continue;
      results.push({ round, date: m[2], numbers, bonus });
      neededRounds.delete(round);
      found++;
    }
    if (found === 0) break;
    if (neededRounds.size === 0) break;
    page++;
    await sleep(500);
  }
  return results;
}

// lottolyzer 최신 회차 번호 조회
async function getLatestRound(): Promise<number> {
  const url = 'https://en.lottolyzer.com/history/south-korea/6_slash_45-lotto/page/1/per-page/1';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const html = await res.text();
    const m = /<td>(\d{3,4})<\/td>/.exec(html);
    return m ? Number(m[1]) : 0;
  } catch { return 0; }
}

async function fetchMissing(rounds: LottoRound[], targetMax: number): Promise<LottoRound[]> {
  const have = new Set(rounds.map(r => r.round));
  const needed = new Set<number>();
  const lastHave = rounds[rounds.length - 1]?.round ?? 0;
  for (let r = lastHave + 1; r <= targetMax; r++) needed.add(r);
  if (needed.size === 0) return rounds;

  console.log(`  신규 ${needed.size}회차 수집 (${lastHave + 1}~${targetMax})...`);

  for (const r of [...needed]) {
    const round = await fetchRoundFromAPI(r);
    if (round) { rounds.push(round); needed.delete(r); }
    await sleep(FETCH_DELAY_MS);
  }
  if (needed.size > 0) {
    console.log(`  dhlottery ${needed.size}회차 실패 → lottolyzer fallback...`);
    const scraped = await fetchFromLottolyzer(new Set(needed));
    rounds.push(...scraped);
  }
  rounds.sort((a, b) => a.round - b.round);
  return rounds;
}

async function fetchAll(): Promise<LottoRound[]> {
  let rounds: LottoRound[] = [];
  if (existsSync(DATA_FILE)) {
    rounds = JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as LottoRound[];
    console.log(`캐시 로드: ${rounds.length}회차 (최신: ${rounds[rounds.length-1].round}회)`);
  } else {
    try { rounds = await fetchFromCSV(); } catch { console.error('CSV 실패'); }
  }

  const latest = await getLatestRound();
  if (!latest) { console.warn('최신 회차 조회 실패'); }
  else {
    const target = Math.max(latest, rounds[rounds.length-1]?.round ?? 0);
    rounds = await fetchMissing(rounds, target);
  }

  writeFileSync(DATA_FILE, JSON.stringify(rounds, null, 2));
  console.log(`총 ${rounds.length}회차 저장 완료\n`);
  return rounds;
}

// ─── NUMERICS ────────────────────────────────────────────────────────────────

const ZONES    = [[1,9],[10,19],[20,29],[30,39],[40,45]] as const;
const PERF_SQ  = new Set([1,4,9,16,25,36]);
const PRIMES   = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43]);
const FIBS     = new Set([1,2,3,5,8,13,21,34]);
const MULT3    = new Set([3,6,9,12,15,18,21,24,27,30,33,36,39,42,45]);
const MULT4    = new Set([4,8,12,16,20,24,28,32,36,40,44]);
const TRI      = new Set([1,3,6,10,15,21,28,36,45]);

// ── number-theoretic (cycle 10/15) ────────────────────────────────────────────
const SIGMA: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 1; x <= 45; x++) { let s = 0; for (let d = 1; d <= x; d++) if (x%d===0) s+=d; a[x]=s; }
  return a;
})();
const PHI: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 1; x <= 45; x++) {
    let m = x, r = x;
    for (let p = 2; p*p <= m; p++) if (m%p===0) { while (m%p===0) m=Math.floor(m/p); r -= Math.floor(r/p); }
    if (m > 1) r -= Math.floor(r/m);
    a[x] = r;
  }
  return a;
})();
const TAU: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 1; x <= 45; x++) { let c = 0; for (let d = 1; d <= x; d++) if (x%d===0) c++; a[x]=c; }
  return a;
})();
const SQUAREFREE: Set<number> = (() => {
  const s = new Set<number>();
  for (let x = 1; x <= 45; x++) {
    let sf = true;
    for (let p = 2; p*p <= x; p++) if (x % (p*p) === 0) { sf = false; break; }
    if (sf) s.add(x);
  }
  return s;
})();

// ── prime-factor family (cycle 11/15) ─────────────────────────────────────────
// BIG_OMEGA[x] = Ω(x) = sum of prime factor multiplicities (e.g. 12=2²·3 → 3)
// OMEGA[x]     = ω(x) = distinct prime factor count (e.g. 12=2²·3 → 2)
// GPF[x]       = greatest prime factor (GPF(1)=1)
// LPF[x]       = least prime factor (LPF(1)=1)
// MU[x]        = Möbius function (μ(1)=1, μ(squarefree p1·…·pk)=(-1)^k, else 0)
const BIG_OMEGA: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 2; x <= 45; x++) { let m = x, c = 0; for (let p = 2; p*p <= m; p++) while (m%p===0) { m=Math.floor(m/p); c++; } if (m > 1) c++; a[x] = c; }
  return a;
})();
const OMEGA: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 2; x <= 45; x++) { let m = x, c = 0; for (let p = 2; p*p <= m; p++) if (m%p===0) { while (m%p===0) m=Math.floor(m/p); c++; } if (m > 1) c++; a[x] = c; }
  return a;
})();
const GPF: number[] = (() => {
  const a = new Array(46).fill(0);
  a[1] = 1;
  for (let x = 2; x <= 45; x++) { let m = x, g = 1; for (let p = 2; p*p <= m; p++) if (m%p===0) { g=p; while (m%p===0) m=Math.floor(m/p); } if (m > 1) g = m; a[x] = g; }
  return a;
})();
const LPF: number[] = (() => {
  const a = new Array(46).fill(0);
  a[1] = 1;
  for (let x = 2; x <= 45; x++) { let m = x, l = m; for (let p = 2; p*p <= m; p++) if (m%p===0) { l = p; break; } a[x] = l; }
  return a;
})();
const MU: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 1; x <= 45; x++) {
    let m = x, mu = 1, sf = true;
    for (let p = 2; p*p <= m; p++) if (m%p===0) { if (Math.floor(m/p)%p===0) { sf = false; break; } m = Math.floor(m/p); mu = -mu; }
    if (!sf) { a[x] = 0; continue; }
    if (m > 1) mu = -mu;
    a[x] = mu;
  }
  return a;
})();

// ── binary / bitwise family (cycle 12/15) ─────────────────────────────────────
// POPCOUNT[x] = number of 1-bits in binary representation
// BIT_LEN[x]  = floor(log2(x)) + 1 = number of bits (BIT_LEN[1]=1, BIT_LEN[45]=6)
// TZ[x]       = trailing zero count (times x is divisible by 2; odd → 0)
const POPCOUNT: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 1; x <= 45; x++) { let m = x, c = 0; while (m) { c += m & 1; m >>>= 1; } a[x] = c; }
  return a;
})();
const BIT_LEN: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 1; x <= 45; x++) { let m = x, c = 0; while (m) { c++; m >>>= 1; } a[x] = c; }
  return a;
})();
const TZ: number[] = (() => {
  const a = new Array(46).fill(0);
  for (let x = 1; x <= 45; x++) { let m = x, c = 0; while ((m & 1) === 0) { c++; m >>>= 1; } a[x] = c; }
  return a;
})();

function sumNums(n: number[])       { return n.reduce((a,b)=>a+b,0); }
function oddCount(n: number[])      { return n.filter(x=>x%2===1).length; }
function consecPairs(n: number[])   { let c=0; for(let i=0;i<5;i++) if(n[i+1]-n[i]===1)c++; return c; }
function numRange(n: number[])      { return n[5]-n[0]; }
function zoneCount(n: number[], lo: number, hi: number) { return n.filter(x=>x>=lo&&x<=hi).length; }
function maxGap(n: number[])        { return Math.max(...n.slice(1).map((v,i)=>v-n[i])); }
function gap2nd(n: number[])        { const g=[...n.slice(1).map((v,i)=>v-n[i])].sort((a,b)=>b-a); return g[1]; }
function minGapFn(n: number[])      { return Math.min(...n.slice(1).map((v,i)=>v-n[i])); }
function sqSum(n: number[])         { return n.reduce((a,x)=>a+x*x,0); }
function tenSum(n: number[])        { return n.reduce((a,x)=>a+Math.floor(x/10),0); }
function oneSum(n: number[])        { return n.reduce((a,x)=>a+(x%10),0); }
function cubSum(n: number[])        { return n.reduce((a,x)=>a+x*x*x,0); }
function gapOuter(n: number[])      { return (n[1]-n[0])+(n[5]-n[4]); }
function gapInner(n: number[])      { return (n[2]-n[1])+(n[4]-n[3]); }
function lastDigitCounts(n: number[]): number[] {
  const c = new Array(10).fill(0);
  for (const x of n) c[x%10]++;
  return c;
}

// ─── STATS (모든 규칙 경계값 포함 — 하드코딩 없음) ──────────────────────────

interface Stats {
  n: number;
  lastRound: number;
  sumMin: number;      sumMax: number;
  oddMin: number;      oddMax: number;
  consecMax: number;
  rangeMin: number;    rangeMax: number;
  maxGapMin: number;
  posMin: number[];    posMax: number[];       // [6]
  gapMax: number[];                            // [5] 인접 간격 상한
  lastDigMax: number[];                        // [10] 끝자리별 상한
  minMaxSumMin: number; minMaxSumMax: number;  // n[0]+n[5]
  midSumMin: number;    midSumMax: number;     // n[2]+n[3]
  multOf5Max: number;
  perfSqMax: number;
  primesMax: number;
  maxRunMax: number;                           // 최대 연속런 상한
  low2Min: number;     low2Max: number;        // n[0]+n[1] 범위
  hi2Min: number;      hi2Max: number;         // n[4]+n[5] 범위
  low3Min: number;     low3Max: number;        // n[0]+n[1]+n[2] 범위
  hi3Min: number;      hi3Max: number;         // n[3]+n[4]+n[5] 범위
  low4Min: number;     low4Max: number;        // n[0]+n[1]+n[2]+n[3] 범위
  hi4Min: number;      hi4Max: number;         // n[2]+n[3]+n[4]+n[5] 범위
  mid4Min: number;     mid4Max: number;        // n[1]+n[2]+n[3]+n[4] 범위
  maxGapMax: number;                           // 최대인접간격 상한
  gap2ndMax: number;                           // 2번째큰 인접간격 상한
  minGapMax: number;                           // 최소 인접간격 상한
  span3LoMin: number;  span3LoMax: number;     // n[2]-n[0] 범위
  span3HiMin: number;  span3HiMax: number;     // n[5]-n[3] 범위
  span4MidMin: number; span4MidMax: number;    // n[4]-n[1] 범위
  span2nMin: number;   span2nMax: number;      // n[3]-n[1] 범위
  span3nMin: number;   span3nMax: number;      // n[4]-n[2] 범위
  oddPosMin: number;   oddPosMax: number;      // n[0]+n[2]+n[4] 범위
  evenPosMin: number;  evenPosMax: number;     // n[1]+n[3]+n[5] 범위
  sqSumMin: number;    sqSumMax: number;       // 번호 제곱합 범위
  tensMin: number;     tensMax: number;        // 10의자리 합 범위
  onesMin: number;     onesMax: number;        // 1의자리 합 범위
  n15Min: number;      n15Max: number;         // n[1]+n[5] 범위
  n25Min: number;      n25Max: number;         // n[2]+n[5] 범위
  n13Min: number;      n13Max: number;         // n[1]+n[3] 범위
  s1245Min: number;    s1245Max: number;       // n[1]+n[2]+n[4]+n[5] 범위
  low5Min: number;     low5Max: number;        // n[0]+n[1]+n[2]+n[3]+n[4] 범위
  hi5Min: number;      hi5Max: number;         // n[1]+n[2]+n[3]+n[4]+n[5] 범위
  gapOuterMax: number;                         // (n[1]-n[0])+(n[5]-n[4]) 상한
  gapInnerMax: number;                         // (n[2]-n[1])+(n[4]-n[3]) 상한
  n03Min: number;      n03Max: number;         // n[0]+n[3] 범위
  n35Min: number;                              // n[3]+n[5] 하한
  cubSumMin: number;   cubSumMax: number;      // 세제곱합 범위
  span1to4Min: number; span1to4Max: number;   // n[3]-n[0] 범위
  span3to6Min: number; span3to6Max: number;   // n[5]-n[2] 범위
  span1to5Min: number; span1to5Max: number;   // n[4]-n[0] 범위
  span2to6Min: number; span2to6Max: number;   // n[5]-n[1] 범위
  n02Min: number;      n02Max: number;         // n[0]+n[2] 범위
  n04Min: number;      n04Max: number;         // n[0]+n[4] 범위
  n14Min: number;      n14Max: number;         // n[1]+n[4] 범위
  n24Min: number;      n24Max: number;         // n[2]+n[4] 범위
  n34Min: number;      n34Max: number;         // n[3]+n[4] 범위
  multOf3Max: number;                          // 3의배수 개수 상한
  fibMax: number;                              // 피보나치수 개수 상한
  mod3SumMin: number;  mod3SumMax: number;     // Σ(n[i]%3) 범위
  samePairMax: number;                         // 인접 동일홀짝 쌍 수 상한
  s013Min: number;     s013Max: number;        // n[0]+n[1]+n[3]
  s014Min: number;     s014Max: number;        // n[0]+n[1]+n[4]
  s023Min: number;     s023Max: number;        // n[0]+n[2]+n[3]
  s135Min: number;     s135Max: number;        // n[1]+n[3]+n[5]
  s025Min: number;     s025Max: number;        // n[0]+n[2]+n[5]
  s035Min: number;     s035Max: number;        // n[0]+n[3]+n[5]
  s124Min: number;     s124Max: number;        // n[1]+n[2]+n[4]
  s015Min: number;     s015Max: number;        // n[0]+n[1]+n[5]
  s235Min: number;     s235Max: number;        // n[2]+n[3]+n[5]
  s125Min: number;     s125Max: number;        // n[1]+n[2]+n[5]
  s0125Min: number;    s0125Max: number;       // n[0]+n[1]+n[2]+n[5]
  s0145Min: number;    s0145Max: number;       // n[0]+n[1]+n[4]+n[5]
  s0245Min: number;    s0245Max: number;       // n[0]+n[2]+n[4]+n[5]
  s1345Min: number;    s1345Max: number;       // n[1]+n[3]+n[4]+n[5]
  gapAlt02Max: number;                        // (n[1]-n[0])+(n[3]-n[2]) 상한
  gapAlt13Max: number;                        // (n[2]-n[1])+(n[4]-n[3]) 상한
  gapSkip03Max: number;                       // (n[1]-n[0])+(n[4]-n[3]) 상한
  gapSkip14Max: number;                       // (n[2]-n[1])+(n[5]-n[4]) 상한
  gapSkip24Max: number;                       // (n[3]-n[2])+(n[5]-n[4]) 상한
  gapSqSumMin: number; gapSqSumMax: number;   // Σ(n[i+1]-n[i])² 범위
  gap024Max: number;                           // g[0]+g[2]+g[4] 상한 (교대)
  gap013Max: number;                           // g[0]+g[1]+g[3] 상한
  gap014Max: number;                           // g[0]+g[1]+g[4] 상한
  gap124Max: number;                           // g[1]+g[2]+g[4] 상한
  gap034Max: number;                           // g[0]+g[3]+g[4] 상한
  gapRangeMax: number;                         // maxGap - minGap 상한
  gap0124Max: number;                          // g[0]+g[1]+g[2]+g[4] 상한
  gap0134Max: number;                          // g[0]+g[1]+g[3]+g[4] 상한
  gap0234Max: number;                          // g[0]+g[2]+g[3]+g[4] 상한
  gapBot2Max: number;                          // 간격 하위2합 상한 (정렬)
  gapTop2Min: number;                          // 간격 상위2합 하한 (정렬)
  gapSortedMedMin: number; gapSortedMedMax: number; // 정렬간격[2] 중앙값 범위
  gapSorted1Max: number;                       // 정렬간격[1] (2번째 작은) 상한
  gapSorted3Max: number;                       // 정렬간격[3] (4번째) 상한
  gapMid3SumMin: number;  gapMid3SumMax: number;    // 정렬간격[1]+[2]+[3] 범위
  gapMidMaxMax: number;                        // max(g[1],g[2],g[3]) 상한
  gapBot3Max: number;                          // 정렬간격[0]+[1]+[2] 상한
  gapTop3Min: number;                          // 정렬간격[2]+[3]+[4] 하한
  gapS04Max: number;                           // 정렬간격[0]+[4] (min+max 간격합) 상한
  gapS02Max: number;                           // 정렬간격[0]+[2] 상한
  gapS14Max: number;                           // 정렬간격[1]+[4] 상한
  oddNumSumMin: number;  oddNumSumMax: number; // 홀수값 번호 합 범위
  evenNumSumMax: number;                       // 짝수값 번호 합 상한
  loHalfSumMax: number;                        // ≤22 번호 합 상한
  hiHalfSumMin: number;                        // ≥23 번호 합 하한
  extremeProdMax: number;                      // n[0]*n[5] 상한
  primeSumMax: number;                         // 소수번호 합 상한
  mult3SumMax: number;                         // 3의배수번호 합 상한
  loThirdSumMax: number;                       // ≤15 번호 합 상한
  midThirdSumMax: number;                      // 16-30 번호 합 상한
  hiThirdSumMin: number;                       // ≥31 번호 합 하한
  perfSqSumMax: number;                        // 완전제곱수번호 합 상한
  fibSumMax: number;                           // 피보나치번호 합 상한
  prodLo2Max: number;                          // n[0]*n[1] 상한
  prodHi2Max: number;                          // n[4]*n[5] 상한
  prodMid2Max: number;                         // n[2]*n[3] 상한
  prodN02Max: number;                          // n[0]*n[2] 상한
  prodN15Max: number;                          // n[1]*n[5] 상한
  prodN35Max: number;                          // n[3]*n[5] 상한
  multOf7Max: number;                          // 7의배수 개수 상한
  mult7SumMax: number;                         // 7의배수번호 합 상한
  weightedSumAscMin: number; weightedSumAscMax: number; // Σ(i+1)*n[i] 범위
  weightedSumDescMin: number; weightedSumDescMax: number; // Σ(6-i)*n[i] 범위
  arithTripleMax: number;                      // 등차수열 트리플 개수 상한
  closeGap2Max: number;                        // 간격≤2인 인접쌍 개수 상한
  sumOfRootsMax: number;                       // Σfloor(√n[i]) 상한
  digitSumMin: number; digitSumMax: number;    // Σ(n[i] 자리수합) 범위
  triMax: number;                              // 삼각수 개수 상한
  mult4Max: number;                            // 4의배수 개수 상한
  extOuterMidMin: number; extOuterMidMax: number; // (n[0]+n[5])-(n[2]+n[3]) 범위
  tripleConsecMax: number;                     // n[i+2]-n[i]=2 (3 연속) 개수 상한
  mod5SumMin: number;  mod5SumMax: number;     // Σ(n[i]%5) 범위
  mod7SumMin: number;  mod7SumMax: number;     // Σ(n[i]%7) 범위
  topBotDiffMin: number; topBotDiffMax: number; // (n[3]+n[4]+n[5])-(n[0]+n[1]+n[2]) 범위
  centerDistMin: number; centerDistMax: number; // Σ|n[i]-23| 범위
  gapProdMin: number;  gapProdMax: number;     // ∏(n[i+1]-n[i]) 범위
  mod4SumMin: number;  mod4SumMax: number;     // Σ(n[i]%4) 범위
  mod9SumMin: number;  mod9SumMax: number;     // Σ(n[i]%9) 범위
  mod11SumMin: number; mod11SumMax: number;    // Σ(n[i]%11) 범위
  varNumMin: number;   varNumMax: number;      // 6·Σn² - (Σn)² (번호 분산 정수형)
  varGapMin: number;   varGapMax: number;      // 5·Σg² - (Σg)² (간격 분산 정수형)
  mod6SumMin: number;  mod6SumMax: number;     // Σ(n[i]%6) 범위
  mod8SumMin: number;  mod8SumMax: number;     // Σ(n[i]%8) 범위
  mod13SumMin: number; mod13SumMax: number;    // Σ(n[i]%13) 범위
  top3ProdMin: number; top3ProdMax: number;    // n[3]*n[4]*n[5] 범위
  sumDigitSumMin: number; sumDigitSumMax: number; // Σn 의 자리수합 (3자리 분해) 범위
  bot3ProdMin: number; bot3ProdMax: number;    // n[0]*n[1]*n[2] 범위 (cycle 5/15)
  mid3ProdMin: number; mid3ProdMax: number;    // n[2]*n[3]*n[4] 범위
  adjProdSumMin: number; adjProdSumMax: number; // Σ n[i]*n[i+1] 범위
  sumMod7Min: number;  sumMod7Max: number;     // (Σn) % 7 범위
  sumMod11Min: number; sumMod11Max: number;    // (Σn) % 11 범위
  prodN03Max: number;                          // n[0]*n[3] 상한 (cycle 6/15)
  prodN13Max: number;                          // n[1]*n[3] 상한
  prodN24Max: number;                          // n[2]*n[4] 상한
  gapSmoothMax: number;                        // Σ|gap[i+1]-gap[i]| (i=0..3) 상한 — 평탄도
  digitProdMin: number; digitProdMax: number;  // Σ(floor(x/10)*(x%10)) 범위 — 자리수곱합
  s034Min: number; s034Max: number;            // n[0]+n[3]+n[4] 범위 (cycle 7/15)
  s123Min: number; s123Max: number;            // n[1]+n[2]+n[3] 범위
  s0235Min: number; s0235Max: number;          // n[0]+n[2]+n[3]+n[5] 범위
  mod10DistMin: number; mod10DistMax: number;  // distinct count of x%10 over 6 numbers
  mod7DistMin: number; mod7DistMax: number;    // distinct count of x%7 over 6 numbers
  mod9DistMin: number; mod9DistMax: number;    // distinct count of x%9 over 6 (cycle 8/15)
  mod11DistMin: number; mod11DistMax: number;  // distinct count of x%11 over 6
  mod13DistMin: number; mod13DistMax: number;  // distinct count of x%13 over 6
  gcdPairsMin: number; gcdPairsMax: number;    // count of pairs (i<j) with gcd(n[i],n[j])>1
  tensDistMin: number; tensDistMax: number;    // distinct count of floor(x/10) over 6 (decade spread)
  maxPairGcdMin: number; maxPairGcdMax: number; // max gcd over all 15 pairs (cycle 9/15)
  palindProdSumMin: number; palindProdSumMax: number; // n[0]*n[5]+n[1]*n[4]+n[2]*n[3]
  crossProdSumMin: number; crossProdSumMax: number;   // n[0]*n[3]+n[1]*n[4]+n[2]*n[5]
  digitSumDistMin: number; digitSumDistMax: number;   // distinct count of digit-sum(n_i)
  oddRunMaxMax: number;                          // longest consecutive run where n[i] is odd
  sigmaSumMin: number; sigmaSumMax: number;      // Σ σ(n[i]) — divisor sum (cycle 10/15)
  phiSumMin: number;   phiSumMax: number;        // Σ φ(n[i]) — Euler totient
  pairGcdSumMin: number; pairGcdSumMax: number;  // Σ_{i<j} gcd(n[i],n[j]) over 15 pairs
  tauSumMin: number;   tauSumMax: number;        // Σ τ(n[i]) — number of divisors
  squarefreeMax: number;                         // count of squarefree numbers in n[]
  bigOmegaSumMin: number; bigOmegaSumMax: number; // Σ Ω(n[i]) — multiplicity prime count (cycle 11/15)
  omegaSumMin: number;    omegaSumMax: number;    // Σ ω(n[i]) — distinct prime count
  gpfSumMin: number;      gpfSumMax: number;      // Σ greatest-prime-factor(n[i])
  lpfSumMin: number;      lpfSumMax: number;      // Σ least-prime-factor(n[i])
  muSumMin: number;       muSumMax: number;       // Σ μ(n[i]) — Möbius (bounded -6..6)
  popcountSumMin: number; popcountSumMax: number; // Σ popcount(n[i]) — bit count (cycle 12/15)
  bitLenSumMin: number;   bitLenSumMax: number;   // Σ bit_length(n[i])
  tzSumMin: number;       tzSumMax: number;       // Σ trailing_zeros(n[i])
  popcountDistMin: number; popcountDistMax: number; // distinct popcount values across 6
  bitLenDistMin: number;  bitLenDistMax: number;  // distinct bit_length values across 6
  digitSumSumMin: number;  digitSumSumMax: number;  // Σ digitSum(n[i]) — total digit-sum across 6 (cycle 13/15)
  digitSumMaxMin: number;  digitSumMaxMax: number;  // min/max of max digitSum per draw
  digitSumMinMin: number;  digitSumMinMax: number;  // min/max of min digitSum per draw
  maxDigitMin: number;     maxDigitMax: number;     // min/max of largest single digit across 12 digit positions
  distinctDigitsMin: number; distinctDigitsMax: number; // distinct digit values (0-9) across 12 digit positions
  altSumMin: number;    altSumMax: number;     // 교번합 n[0]-n[1]+n[2]-n[3]+n[4]-n[5] (cycle 14/15)
  qPosAscMin: number;   qPosAscMax: number;    // Σ i²·n[i] (i=0..5) weights (0,1,4,9,16,25)
  qPosDescMin: number;  qPosDescMax: number;   // Σ (5-i)²·n[i] weights (25,16,9,4,1,0)
  vWeightMin: number;   vWeightMax: number;    // V형 5·n[0]+3·n[1]+1·n[2]+1·n[3]+3·n[4]+5·n[5]
  lWeightMin: number;   lWeightMax: number;    // Λ형 1·n[0]+3·n[1]+5·n[2]+5·n[3]+3·n[4]+1·n[5]
  gapAccelMin: number;  gapAccelMax: number;   // 간격가속제곱합 Σ(g[i+1]-g[i])² (i=0..3) (cycle 15/15)
  primeWMin: number;    primeWMax: number;     // 소수가중합 2·n[0]+3·n[1]+5·n[2]+7·n[3]+11·n[4]+13·n[5]
  fibWMin: number;      fibWMax: number;       // 피보나치가중합 1·n[0]+1·n[1]+2·n[2]+3·n[3]+5·n[4]+8·n[5]
  bellWMin: number;     bellWMax: number;      // 종모양가중합 6·n[0]+10·n[1]+12·n[2]+12·n[3]+10·n[4]+6·n[5]
  triWMin: number;      triWMax: number;       // 삼각수가중합 1·n[0]+3·n[1]+6·n[2]+10·n[3]+15·n[4]+21·n[5]
  // ── mod15/17 합 + 각자리수 min + 정사각수/세제곱수 가중합 (cycle 16/?? 새 batch 1/5) ──
  mod15SumMin: number;  mod15SumMax: number;   // Σ (n[i] mod 15)
  mod17SumMin: number;  mod17SumMax: number;   // Σ (n[i] mod 17)
  minDigitMin: number;  minDigitMax: number;   // 각자리수 min (max + distinct 짝 보강)
  sqWMin: number;       sqWMax: number;        // 정사각수가중합 1·n[0]+4·n[1]+9·n[2]+16·n[3]+25·n[4]+36·n[5]
  cubWMin: number;      cubWMax: number;       // 세제곱수가중합 1·n[0]+8·n[1]+27·n[2]+64·n[3]+125·n[4]+216·n[5]
  zones: Array<{lo:number; hi:number; min:number; max:number}>;
  freq: number[];                              // [46]
}

function computeStats(rounds: LottoRound[]): Stats {
  const ns = rounds.map(r => r.numbers);

  const sums    = ns.map(sumNums);
  const odds    = ns.map(oddCount);
  const consecs = ns.map(consecPairs);
  const ranges  = ns.map(numRange);
  const maxGaps = ns.map(maxGap);

  const posMin = [0,1,2,3,4,5].map(i => Math.min(...ns.map(n=>n[i])));
  const posMax = [0,1,2,3,4,5].map(i => Math.max(...ns.map(n=>n[i])));

  // 인접 간격 상한 (위치별)
  const gapMax = [0,1,2,3,4].map(i => Math.max(...ns.map(n=>n[i+1]-n[i])));

  // 끝자리별 상한
  const lastDigMax = new Array(10).fill(0);
  for (const n of ns) {
    const c = lastDigitCounts(n);
    for (let d=0;d<10;d++) lastDigMax[d] = Math.max(lastDigMax[d], c[d]);
  }

  const minMaxSums = ns.map(n=>n[0]+n[5]);
  const midSums    = ns.map(n=>n[2]+n[3]);

  const maxRuns = ns.map(n => {
    let max=1, cur=1;
    for (let i=1;i<6;i++) { if(n[i]-n[i-1]===1){cur++;if(cur>max)max=cur;}else cur=1; }
    return max;
  });

  const low2s     = ns.map(n=>n[0]+n[1]);
  const hi2s      = ns.map(n=>n[4]+n[5]);
  const low3s     = ns.map(n=>n[0]+n[1]+n[2]);
  const hi3s      = ns.map(n=>n[3]+n[4]+n[5]);
  const low4s     = ns.map(n=>n[0]+n[1]+n[2]+n[3]);
  const hi4s      = ns.map(n=>n[2]+n[3]+n[4]+n[5]);
  const mid4s     = ns.map(n=>n[1]+n[2]+n[3]+n[4]);
  const gap2nds   = ns.map(gap2nd);
  const minGapVs  = ns.map(minGapFn);
  const span3Los  = ns.map(n=>n[2]-n[0]);
  const span3His  = ns.map(n=>n[5]-n[3]);
  const span4Mids = ns.map(n=>n[4]-n[1]);
  const span2ns   = ns.map(n=>n[3]-n[1]);
  const span3ns   = ns.map(n=>n[4]-n[2]);
  const oddPoss   = ns.map(n=>n[0]+n[2]+n[4]);
  const evenPoss  = ns.map(n=>n[1]+n[3]+n[5]);
  const sqSums    = ns.map(sqSum);
  const tenSums   = ns.map(tenSum);
  const oneSums   = ns.map(oneSum);
  const n15s      = ns.map(n=>n[1]+n[5]);
  const n25s      = ns.map(n=>n[2]+n[5]);
  const n13s      = ns.map(n=>n[1]+n[3]);
  const n03s      = ns.map(n=>n[0]+n[3]);
  const n35s      = ns.map(n=>n[3]+n[5]);
  const s1245s    = ns.map(n=>n[1]+n[2]+n[4]+n[5]);
  const low5s     = ns.map(n=>n[0]+n[1]+n[2]+n[3]+n[4]);
  const hi5s      = ns.map(n=>n[1]+n[2]+n[3]+n[4]+n[5]);
  const gapOuters  = ns.map(gapOuter);
  const gapInners  = ns.map(gapInner);
  const cubSums    = ns.map(cubSum);
  const span1to4s  = ns.map(n=>n[3]-n[0]);
  const span3to6s  = ns.map(n=>n[5]-n[2]);
  const span1to5s  = ns.map(n=>n[4]-n[0]);
  const span2to6s  = ns.map(n=>n[5]-n[1]);
  const n02s       = ns.map(n=>n[0]+n[2]);
  const n04s       = ns.map(n=>n[0]+n[4]);
  const n14s       = ns.map(n=>n[1]+n[4]);
  const n24s       = ns.map(n=>n[2]+n[4]);
  const n34s       = ns.map(n=>n[3]+n[4]);
  const mult3s     = ns.map(n=>n.filter(x=>MULT3.has(x)).length);
  const fibCnts    = ns.map(n=>n.filter(x=>FIBS.has(x)).length);
  const mod3Sums   = ns.map(n=>n.reduce((a,x)=>a+(x%3),0));
  const samePairs  = ns.map(n=>{ let c=0; for(let i=0;i<5;i++) if((n[i]%2)===(n[i+1]%2))c++; return c; });
  const s013s      = ns.map(n=>n[0]+n[1]+n[3]);
  const s014s      = ns.map(n=>n[0]+n[1]+n[4]);
  const s023s      = ns.map(n=>n[0]+n[2]+n[3]);
  const s135s      = ns.map(n=>n[1]+n[3]+n[5]);
  const s025s      = ns.map(n=>n[0]+n[2]+n[5]);
  const s035s      = ns.map(n=>n[0]+n[3]+n[5]);
  const s124s      = ns.map(n=>n[1]+n[2]+n[4]);
  const s015s      = ns.map(n=>n[0]+n[1]+n[5]);
  const s235s      = ns.map(n=>n[2]+n[3]+n[5]);
  const s125s      = ns.map(n=>n[1]+n[2]+n[5]);
  const s0125s     = ns.map(n=>n[0]+n[1]+n[2]+n[5]);
  const s0145s     = ns.map(n=>n[0]+n[1]+n[4]+n[5]);
  const s0245s     = ns.map(n=>n[0]+n[2]+n[4]+n[5]);
  const s1345s     = ns.map(n=>n[1]+n[3]+n[4]+n[5]);
  const gapAlt02s  = ns.map(n=>(n[1]-n[0])+(n[3]-n[2]));
  const gapAlt13s  = ns.map(n=>(n[2]-n[1])+(n[4]-n[3]));
  const gapSkip03s = ns.map(n=>(n[1]-n[0])+(n[4]-n[3]));
  const gapSkip14s = ns.map(n=>(n[2]-n[1])+(n[5]-n[4]));
  const gapSkip24s = ns.map(n=>(n[3]-n[2])+(n[5]-n[4]));
  const gapSqSums  = ns.map(n=>[0,1,2,3,4].reduce((a,i)=>a+(n[i+1]-n[i])**2,0));
  const gap024s    = ns.map(n=>(n[1]-n[0])+(n[3]-n[2])+(n[5]-n[4]));
  const gap013s    = ns.map(n=>(n[1]-n[0])+(n[2]-n[1])+(n[4]-n[3]));
  const gap014s    = ns.map(n=>(n[1]-n[0])+(n[2]-n[1])+(n[5]-n[4]));
  const gap124s    = ns.map(n=>(n[2]-n[1])+(n[3]-n[2])+(n[5]-n[4]));
  const gap034s    = ns.map(n=>(n[1]-n[0])+(n[4]-n[3])+(n[5]-n[4]));
  const gapRanges  = ns.map(n=>{ const g=([0,1,2,3,4].map(i=>n[i+1]-n[i])); return Math.max(...g)-Math.min(...g); });
  const gap0124s   = ns.map(n=>(n[1]-n[0])+(n[2]-n[1])+(n[3]-n[2])+(n[5]-n[4]));
  const gap0134s   = ns.map(n=>(n[1]-n[0])+(n[2]-n[1])+(n[4]-n[3])+(n[5]-n[4]));
  const gap0234s   = ns.map(n=>(n[1]-n[0])+(n[3]-n[2])+(n[4]-n[3])+(n[5]-n[4]));
  const gapsSorted = ns.map(n=>[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b));
  const gapBot2s     = gapsSorted.map(g=>g[0]+g[1]);
  const gapTop2s     = gapsSorted.map(g=>g[3]+g[4]);
  const gapSortedMed = gapsSorted.map(g=>g[2]);
  const gapSorted1s  = gapsSorted.map(g=>g[1]);
  const gapSorted3s  = gapsSorted.map(g=>g[3]);
  const gapMid3Sums  = gapsSorted.map(g=>g[1]+g[2]+g[3]);
  const gapMidMaxs   = ns.map(n=>Math.max(n[2]-n[1],n[3]-n[2],n[4]-n[3]));
  const gapBot3s     = gapsSorted.map(g=>g[0]+g[1]+g[2]);
  const gapTop3s     = gapsSorted.map(g=>g[2]+g[3]+g[4]);
  const gapS04s      = gapsSorted.map(g=>g[0]+g[4]);
  const gapS02s      = gapsSorted.map(g=>g[0]+g[2]);
  const gapS14s      = gapsSorted.map(g=>g[1]+g[4]);
  const oddNumSums   = ns.map(n=>n.filter(x=>x%2===1).reduce((a,b)=>a+b,0));
  const evenNumSums  = ns.map(n=>n.filter(x=>x%2===0).reduce((a,b)=>a+b,0));
  const loHalfSums   = ns.map(n=>n.filter(x=>x<=22).reduce((a,b)=>a+b,0));
  const hiHalfSums   = ns.map(n=>n.filter(x=>x>=23).reduce((a,b)=>a+b,0));
  const extremeProds  = ns.map(n=>n[0]*n[5]);
  const primeSums     = ns.map(n=>n.filter(x=>PRIMES.has(x)).reduce((a,b)=>a+b,0));
  const mult3Sums     = ns.map(n=>n.filter(x=>MULT3.has(x)).reduce((a,b)=>a+b,0));
  const loThirdSums   = ns.map(n=>n.filter(x=>x<=15).reduce((a,b)=>a+b,0));
  const midThirdSums  = ns.map(n=>n.filter(x=>x>=16&&x<=30).reduce((a,b)=>a+b,0));
  const hiThirdSums   = ns.map(n=>n.filter(x=>x>=31).reduce((a,b)=>a+b,0));
  const perfSqSums    = ns.map(n=>n.filter(x=>PERF_SQ.has(x)).reduce((a,b)=>a+b,0));
  const fibSums       = ns.map(n=>n.filter(x=>FIBS.has(x)).reduce((a,b)=>a+b,0));
  const prodLo2s      = ns.map(n=>n[0]*n[1]);
  const prodHi2s      = ns.map(n=>n[4]*n[5]);
  const prodMid2s     = ns.map(n=>n[2]*n[3]);
  const MULT7         = new Set([7,14,21,28,35,42]);
  const prodN02s      = ns.map(n=>n[0]*n[2]);
  const prodN15s      = ns.map(n=>n[1]*n[5]);
  const prodN35s      = ns.map(n=>n[3]*n[5]);
  const mult7Cnts     = ns.map(n=>n.filter(x=>MULT7.has(x)).length);
  const mult7Sums      = ns.map(n=>n.filter(x=>MULT7.has(x)).reduce((a,b)=>a+b,0));
  const weightedAsc   = ns.map(n=>n.reduce((a,x,i)=>a+(i+1)*x,0));
  const weightedDesc  = ns.map(n=>n.reduce((a,x,i)=>a+(6-i)*x,0));
  const arithTriples  = ns.map(n=>{ let c=0; for(let i=0;i<4;i++) for(let j=i+1;j<5;j++) for(let k=j+1;k<6;k++) if(n[j]-n[i]===n[k]-n[j]) c++; return c; });
  const closeGap2s    = ns.map(n=>{ let c=0; for(let i=0;i<5;i++) if(n[i+1]-n[i]<=2) c++; return c; });
  const sumOfRoots    = ns.map(n=>n.reduce((a,x)=>a+Math.floor(Math.sqrt(x)),0));
  const digitSums     = ns.map(n=>n.reduce((a,x)=>a+(x%10)+Math.floor(x/10),0));
  const triCnts       = ns.map(n=>n.filter(x=>TRI.has(x)).length);
  const mult4Cnts     = ns.map(n=>n.filter(x=>MULT4.has(x)).length);
  const extOuterMids  = ns.map(n=>(n[0]+n[5])-(n[2]+n[3]));
  const tripleConsecs = ns.map(n=>{ let c=0; for(let i=0;i<4;i++) if(n[i+2]-n[i]===2) c++; return c; });
  const mod5Sums      = ns.map(n=>n.reduce((a,x)=>a+(x%5),0));
  const mod7Sums      = ns.map(n=>n.reduce((a,x)=>a+(x%7),0));
  const topBotDiffs   = ns.map(n=>(n[3]+n[4]+n[5])-(n[0]+n[1]+n[2]));
  const centerDists   = ns.map(n=>n.reduce((a,x)=>a+Math.abs(x-23),0));
  const gapProds      = ns.map(n=>[0,1,2,3,4].reduce((a,i)=>a*(n[i+1]-n[i]),1));
  const mod4Sums      = ns.map(n=>n.reduce((a,x)=>a+(x%4),0));
  const mod9Sums      = ns.map(n=>n.reduce((a,x)=>a+(x%9),0));
  const mod11Sums     = ns.map(n=>n.reduce((a,x)=>a+(x%11),0));
  const varNums       = ns.map(n=>{ const s=n.reduce((a,x)=>a+x,0); const sq=n.reduce((a,x)=>a+x*x,0); return 6*sq - s*s; });
  const varGaps       = ns.map(n=>{ const gs=[0,1,2,3,4].map(i=>n[i+1]-n[i]); const s=gs.reduce((a,x)=>a+x,0); const sq=gs.reduce((a,x)=>a+x*x,0); return 5*sq - s*s; });
  const mod6Sums      = ns.map(n=>n.reduce((a,x)=>a+(x%6),0));
  const mod8Sums      = ns.map(n=>n.reduce((a,x)=>a+(x%8),0));
  const mod13Sums     = ns.map(n=>n.reduce((a,x)=>a+(x%13),0));
  const top3Prods     = ns.map(n=>n[3]*n[4]*n[5]);
  const sumDigitSums  = ns.map(n=>{ const s=n.reduce((a,x)=>a+x,0); return (s%10)+Math.floor(s/100)+Math.floor((s/10)%10); });
  const bot3Prods     = ns.map(n=>n[0]*n[1]*n[2]);
  const mid3Prods     = ns.map(n=>n[2]*n[3]*n[4]);
  const adjProdSums   = ns.map(n=>n[0]*n[1]+n[1]*n[2]+n[2]*n[3]+n[3]*n[4]+n[4]*n[5]);
  const sumMod7s      = ns.map(n=>n.reduce((a,x)=>a+x,0)%7);
  const sumMod11s     = ns.map(n=>n.reduce((a,x)=>a+x,0)%11);
  const prodN03s      = ns.map(n=>n[0]*n[3]);
  const prodN13s      = ns.map(n=>n[1]*n[3]);
  const prodN24s      = ns.map(n=>n[2]*n[4]);
  const gapSmooths    = ns.map(n=>{
    const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]);
    return Math.abs(g[1]-g[0])+Math.abs(g[2]-g[1])+Math.abs(g[3]-g[2])+Math.abs(g[4]-g[3]);
  });
  const digitProds    = ns.map(n=>n.reduce((a,x)=>a+Math.floor(x/10)*(x%10),0));
  const s034s         = ns.map(n=>n[0]+n[3]+n[4]);
  const s123s         = ns.map(n=>n[1]+n[2]+n[3]);
  const s0235s        = ns.map(n=>n[0]+n[2]+n[3]+n[5]);
  const mod10Dists    = ns.map(n=>new Set(n.map(x=>x%10)).size);
  const mod7Dists     = ns.map(n=>new Set(n.map(x=>x%7)).size);
  const mod9Dists     = ns.map(n=>new Set(n.map(x=>x%9)).size);
  const mod11Dists    = ns.map(n=>new Set(n.map(x=>x%11)).size);
  const mod13Dists    = ns.map(n=>new Set(n.map(x=>x%13)).size);
  const gcd2 = (a: number, b: number): number => { while (b) { [a, b] = [b, a % b]; } return a; };
  const gcdPairs      = ns.map(n=>{
    let c = 0;
    for (let i = 0; i < 5; i++) for (let j = i+1; j < 6; j++) if (gcd2(n[i], n[j]) > 1) c++;
    return c;
  });
  const tensDists     = ns.map(n=>new Set(n.map(x=>Math.floor(x/10))).size);
  const maxPairGcds   = ns.map(n=>{
    let m = 1;
    for (let i = 0; i < 5; i++) for (let j = i+1; j < 6; j++) {
      const g = gcd2(n[i], n[j]); if (g > m) m = g;
    }
    return m;
  });
  const palindProdSums = ns.map(n=>n[0]*n[5]+n[1]*n[4]+n[2]*n[3]);
  const crossProdSums  = ns.map(n=>n[0]*n[3]+n[1]*n[4]+n[2]*n[5]);
  const digitSumOf     = (x: number) => (x % 10) + Math.floor(x / 10);
  const digitSumDists  = ns.map(n=>new Set(n.map(digitSumOf)).size);
  const oddRunMaxs     = ns.map(n=>{
    let m = 0, cur = 0;
    for (const x of n) { if (x % 2 === 1) { cur++; if (cur > m) m = cur; } else cur = 0; }
    return m;
  });
  const sigmaSums     = ns.map(n=>n.reduce((a,x)=>a+SIGMA[x],0));
  const phiSums       = ns.map(n=>n.reduce((a,x)=>a+PHI[x],0));
  const pairGcdSums   = ns.map(n=>{
    let s = 0;
    for (let i = 0; i < 5; i++) for (let j = i+1; j < 6; j++) s += gcd2(n[i], n[j]);
    return s;
  });
  const tauSums       = ns.map(n=>n.reduce((a,x)=>a+TAU[x],0));
  const squarefrees   = ns.map(n=>n.filter(x=>SQUAREFREE.has(x)).length);
  const bigOmegaSums  = ns.map(n=>n.reduce((a,x)=>a+BIG_OMEGA[x],0));
  const omegaSums     = ns.map(n=>n.reduce((a,x)=>a+OMEGA[x],0));
  const gpfSums       = ns.map(n=>n.reduce((a,x)=>a+GPF[x],0));
  const lpfSums       = ns.map(n=>n.reduce((a,x)=>a+LPF[x],0));
  const muSums        = ns.map(n=>n.reduce((a,x)=>a+MU[x],0));
  const popcountSums  = ns.map(n=>n.reduce((a,x)=>a+POPCOUNT[x],0));
  const bitLenSums    = ns.map(n=>n.reduce((a,x)=>a+BIT_LEN[x],0));
  const tzSums        = ns.map(n=>n.reduce((a,x)=>a+TZ[x],0));
  const popcountDists = ns.map(n=>new Set(n.map(x=>POPCOUNT[x])).size);
  const bitLenDists   = ns.map(n=>new Set(n.map(x=>BIT_LEN[x])).size);
  const digitSumsPer  = ns.map(n=>n.map(x=>(x%10)+Math.floor(x/10)));
  const digitSumSums  = digitSumsPer.map(d=>d.reduce((a,x)=>a+x,0));
  const digitSumMaxes = digitSumsPer.map(d=>Math.max(...d));
  const digitSumMins  = digitSumsPer.map(d=>Math.min(...d));
  const allDigitsPer  = ns.map(n=>n.flatMap(x=>[Math.floor(x/10), x%10]));
  const maxDigits     = allDigitsPer.map(d=>Math.max(...d));
  const distinctDigs  = allDigitsPer.map(d=>new Set(d).size);
  // ── cycle 14/15 positional weighting family ────────────────────────────────
  const altSums       = ns.map(n=>n[0]-n[1]+n[2]-n[3]+n[4]-n[5]);
  const qPosAscs      = ns.map(n=>n.reduce((a,x,i)=>a+i*i*x,0));
  const qPosDescs     = ns.map(n=>n.reduce((a,x,i)=>a+(5-i)*(5-i)*x,0));
  const vWeights      = ns.map(n=>5*n[0]+3*n[1]+1*n[2]+1*n[3]+3*n[4]+5*n[5]);
  const lWeights      = ns.map(n=>1*n[0]+3*n[1]+5*n[2]+5*n[3]+3*n[4]+1*n[5]);
  // ── cycle 15/15 finale: gap acceleration + named weight family ─────────────
  const gapAccels     = ns.map(n=>{
    const g = [n[1]-n[0], n[2]-n[1], n[3]-n[2], n[4]-n[3], n[5]-n[4]];
    return (g[1]-g[0])**2 + (g[2]-g[1])**2 + (g[3]-g[2])**2 + (g[4]-g[3])**2;
  });
  const primeWs       = ns.map(n=>2*n[0]+3*n[1]+5*n[2]+7*n[3]+11*n[4]+13*n[5]);
  const fibWs         = ns.map(n=>1*n[0]+1*n[1]+2*n[2]+3*n[3]+5*n[4]+8*n[5]);
  const bellWs        = ns.map(n=>6*n[0]+10*n[1]+12*n[2]+12*n[3]+10*n[4]+6*n[5]);
  const triWs         = ns.map(n=>1*n[0]+3*n[1]+6*n[2]+10*n[3]+15*n[4]+21*n[5]);
  // ── cycle 16/?? batch 1/5: mod15/17 합 + 각자리수 min + 정사각수/세제곱수 가중합 ─
  const mod15Sums     = ns.map(n=>n.reduce((a,x)=>a+(x%15),0));
  const mod17Sums     = ns.map(n=>n.reduce((a,x)=>a+(x%17),0));
  const minDigits     = allDigitsPer.map(d=>Math.min(...d));
  const sqWs          = ns.map(n=>1*n[0]+4*n[1]+9*n[2]+16*n[3]+25*n[4]+36*n[5]);
  const cubWs         = ns.map(n=>1*n[0]+8*n[1]+27*n[2]+64*n[3]+125*n[4]+216*n[5]);

  const freq = new Array(46).fill(0);
  for (const n of ns) for (const x of n) freq[x]++;

  const zones = ZONES.map(([lo,hi]) => {
    const c = ns.map(n=>zoneCount(n,lo,hi));
    return { lo, hi, min: Math.min(...c), max: Math.max(...c) };
  });

  return {
    n: rounds.length,
    lastRound: rounds[rounds.length-1].round,
    sumMin: Math.min(...sums),   sumMax: Math.max(...sums),
    oddMin: Math.min(...odds),   oddMax: Math.max(...odds),
    consecMax: Math.max(...consecs),
    rangeMin: Math.min(...ranges), rangeMax: Math.max(...ranges),
    maxGapMin: Math.min(...maxGaps),
    posMin, posMax,
    gapMax,
    lastDigMax,
    minMaxSumMin: Math.min(...minMaxSums), minMaxSumMax: Math.max(...minMaxSums),
    midSumMin: Math.min(...midSums),       midSumMax: Math.max(...midSums),
    multOf5Max: Math.max(...ns.map(n=>n.filter(x=>x%5===0).length)),
    perfSqMax:  Math.max(...ns.map(n=>n.filter(x=>PERF_SQ.has(x)).length)),
    primesMax:  Math.max(...ns.map(n=>n.filter(x=>PRIMES.has(x)).length)),
    maxRunMax:    Math.max(...maxRuns),
    maxGapMax:    Math.max(...maxGaps),
    gap2ndMax:    Math.max(...gap2nds),
    minGapMax:    Math.max(...minGapVs),
    low2Min:      Math.min(...low2s),    low2Max:      Math.max(...low2s),
    hi2Min:       Math.min(...hi2s),     hi2Max:       Math.max(...hi2s),
    low3Min:      Math.min(...low3s),    low3Max:      Math.max(...low3s),
    hi3Min:       Math.min(...hi3s),     hi3Max:       Math.max(...hi3s),
    low4Min:      Math.min(...low4s),    low4Max:      Math.max(...low4s),
    hi4Min:       Math.min(...hi4s),     hi4Max:       Math.max(...hi4s),
    mid4Min:      Math.min(...mid4s),    mid4Max:      Math.max(...mid4s),
    span3LoMin:   Math.min(...span3Los), span3LoMax:   Math.max(...span3Los),
    span3HiMin:   Math.min(...span3His), span3HiMax:   Math.max(...span3His),
    span4MidMin:  Math.min(...span4Mids),span4MidMax:  Math.max(...span4Mids),
    span2nMin:    Math.min(...span2ns),  span2nMax:    Math.max(...span2ns),
    span3nMin:    Math.min(...span3ns),  span3nMax:    Math.max(...span3ns),
    oddPosMin:    Math.min(...oddPoss),  oddPosMax:    Math.max(...oddPoss),
    evenPosMin:   Math.min(...evenPoss), evenPosMax:   Math.max(...evenPoss),
    sqSumMin:     Math.min(...sqSums),   sqSumMax:     Math.max(...sqSums),
    tensMin:      Math.min(...tenSums),  tensMax:      Math.max(...tenSums),
    onesMin:      Math.min(...oneSums),  onesMax:      Math.max(...oneSums),
    n15Min:       Math.min(...n15s),     n15Max:       Math.max(...n15s),
    n25Min:       Math.min(...n25s),     n25Max:       Math.max(...n25s),
    n13Min:       Math.min(...n13s),     n13Max:       Math.max(...n13s),
    s1245Min:     Math.min(...s1245s),   s1245Max:     Math.max(...s1245s),
    low5Min:      Math.min(...low5s),    low5Max:      Math.max(...low5s),
    hi5Min:       Math.min(...hi5s),     hi5Max:       Math.max(...hi5s),
    gapOuterMax:  Math.max(...gapOuters),
    gapInnerMax:  Math.max(...gapInners),
    n03Min:       Math.min(...n03s),     n03Max:       Math.max(...n03s),
    n35Min:       Math.min(...n35s),
    cubSumMin:    Math.min(...cubSums),  cubSumMax:    Math.max(...cubSums),
    span1to4Min:  Math.min(...span1to4s), span1to4Max: Math.max(...span1to4s),
    span3to6Min:  Math.min(...span3to6s), span3to6Max: Math.max(...span3to6s),
    span1to5Min:  Math.min(...span1to5s), span1to5Max: Math.max(...span1to5s),
    span2to6Min:  Math.min(...span2to6s), span2to6Max: Math.max(...span2to6s),
    n02Min:       Math.min(...n02s),    n02Max:       Math.max(...n02s),
    n04Min:       Math.min(...n04s),    n04Max:       Math.max(...n04s),
    n14Min:       Math.min(...n14s),    n14Max:       Math.max(...n14s),
    n24Min:       Math.min(...n24s),    n24Max:       Math.max(...n24s),
    n34Min:       Math.min(...n34s),    n34Max:       Math.max(...n34s),
    multOf3Max:   Math.max(...mult3s),
    fibMax:       Math.max(...fibCnts),
    mod3SumMin:   Math.min(...mod3Sums), mod3SumMax:  Math.max(...mod3Sums),
    samePairMax:  Math.max(...samePairs),
    s013Min:      Math.min(...s013s),    s013Max:      Math.max(...s013s),
    s014Min:      Math.min(...s014s),    s014Max:      Math.max(...s014s),
    s023Min:      Math.min(...s023s),    s023Max:      Math.max(...s023s),
    s135Min:      Math.min(...s135s),    s135Max:      Math.max(...s135s),
    s025Min:      Math.min(...s025s),    s025Max:      Math.max(...s025s),
    s035Min:      Math.min(...s035s),    s035Max:      Math.max(...s035s),
    s124Min:      Math.min(...s124s),    s124Max:      Math.max(...s124s),
    s015Min:      Math.min(...s015s),    s015Max:      Math.max(...s015s),
    s235Min:      Math.min(...s235s),    s235Max:      Math.max(...s235s),
    s125Min:      Math.min(...s125s),    s125Max:      Math.max(...s125s),
    s0125Min:     Math.min(...s0125s),   s0125Max:     Math.max(...s0125s),
    s0145Min:     Math.min(...s0145s),   s0145Max:     Math.max(...s0145s),
    s0245Min:     Math.min(...s0245s),   s0245Max:     Math.max(...s0245s),
    s1345Min:     Math.min(...s1345s),   s1345Max:     Math.max(...s1345s),
    gapAlt02Max:  Math.max(...gapAlt02s),
    gapAlt13Max:  Math.max(...gapAlt13s),
    gapSkip03Max: Math.max(...gapSkip03s),
    gapSkip14Max: Math.max(...gapSkip14s),
    gapSkip24Max: Math.max(...gapSkip24s),
    gapSqSumMin:  Math.min(...gapSqSums), gapSqSumMax: Math.max(...gapSqSums),
    gap024Max:    Math.max(...gap024s),
    gap013Max:    Math.max(...gap013s),
    gap014Max:    Math.max(...gap014s),
    gap124Max:    Math.max(...gap124s),
    gap034Max:    Math.max(...gap034s),
    gapRangeMax:  Math.max(...gapRanges),
    gap0124Max:   Math.max(...gap0124s),
    gap0134Max:   Math.max(...gap0134s),
    gap0234Max:   Math.max(...gap0234s),
    gapBot2Max:   Math.max(...gapBot2s),
    gapTop2Min:   Math.min(...gapTop2s),
    gapSortedMedMin: Math.min(...gapSortedMed), gapSortedMedMax: Math.max(...gapSortedMed),
    gapSorted1Max:   Math.max(...gapSorted1s),
    gapSorted3Max:   Math.max(...gapSorted3s),
    gapMid3SumMin:   Math.min(...gapMid3Sums),  gapMid3SumMax:   Math.max(...gapMid3Sums),
    gapMidMaxMax:    Math.max(...gapMidMaxs),
    gapBot3Max:      Math.max(...gapBot3s),
    gapTop3Min:      Math.min(...gapTop3s),
    gapS04Max:       Math.max(...gapS04s),
    gapS02Max:       Math.max(...gapS02s),
    gapS14Max:       Math.max(...gapS14s),
    oddNumSumMin:    Math.min(...oddNumSums),   oddNumSumMax:  Math.max(...oddNumSums),
    evenNumSumMax:   Math.max(...evenNumSums),
    loHalfSumMax:    Math.max(...loHalfSums),
    hiHalfSumMin:    Math.min(...hiHalfSums),
    extremeProdMax:  Math.max(...extremeProds),
    primeSumMax:     Math.max(...primeSums),
    mult3SumMax:     Math.max(...mult3Sums),
    loThirdSumMax:   Math.max(...loThirdSums),
    midThirdSumMax:  Math.max(...midThirdSums),
    hiThirdSumMin:   Math.min(...hiThirdSums),
    perfSqSumMax:    Math.max(...perfSqSums),
    fibSumMax:       Math.max(...fibSums),
    prodLo2Max:      Math.max(...prodLo2s),
    prodHi2Max:      Math.max(...prodHi2s),
    prodMid2Max:     Math.max(...prodMid2s),
    prodN02Max:      Math.max(...prodN02s),
    prodN15Max:      Math.max(...prodN15s),
    prodN35Max:      Math.max(...prodN35s),
    multOf7Max:      Math.max(...mult7Cnts),
    mult7SumMax:     Math.max(...mult7Sums),
    weightedSumAscMin:  Math.min(...weightedAsc),  weightedSumAscMax:  Math.max(...weightedAsc),
    weightedSumDescMin: Math.min(...weightedDesc), weightedSumDescMax: Math.max(...weightedDesc),
    arithTripleMax:  Math.max(...arithTriples),
    closeGap2Max:    Math.max(...closeGap2s),
    sumOfRootsMax:   Math.max(...sumOfRoots),
    digitSumMin:     Math.min(...digitSums),    digitSumMax: Math.max(...digitSums),
    triMax:          Math.max(...triCnts),
    mult4Max:        Math.max(...mult4Cnts),
    extOuterMidMin:  Math.min(...extOuterMids), extOuterMidMax: Math.max(...extOuterMids),
    tripleConsecMax: Math.max(...tripleConsecs),
    mod5SumMin:      Math.min(...mod5Sums),    mod5SumMax:    Math.max(...mod5Sums),
    mod7SumMin:      Math.min(...mod7Sums),    mod7SumMax:    Math.max(...mod7Sums),
    topBotDiffMin:   Math.min(...topBotDiffs), topBotDiffMax: Math.max(...topBotDiffs),
    centerDistMin:   Math.min(...centerDists), centerDistMax: Math.max(...centerDists),
    gapProdMin:      Math.min(...gapProds),    gapProdMax:    Math.max(...gapProds),
    mod4SumMin:      Math.min(...mod4Sums),    mod4SumMax:    Math.max(...mod4Sums),
    mod9SumMin:      Math.min(...mod9Sums),    mod9SumMax:    Math.max(...mod9Sums),
    mod11SumMin:     Math.min(...mod11Sums),   mod11SumMax:   Math.max(...mod11Sums),
    varNumMin:       Math.min(...varNums),     varNumMax:     Math.max(...varNums),
    varGapMin:       Math.min(...varGaps),     varGapMax:     Math.max(...varGaps),
    mod6SumMin:      Math.min(...mod6Sums),    mod6SumMax:    Math.max(...mod6Sums),
    mod8SumMin:      Math.min(...mod8Sums),    mod8SumMax:    Math.max(...mod8Sums),
    mod13SumMin:     Math.min(...mod13Sums),   mod13SumMax:   Math.max(...mod13Sums),
    top3ProdMin:     Math.min(...top3Prods),   top3ProdMax:   Math.max(...top3Prods),
    sumDigitSumMin:  Math.min(...sumDigitSums),sumDigitSumMax:Math.max(...sumDigitSums),
    bot3ProdMin:     Math.min(...bot3Prods),   bot3ProdMax:   Math.max(...bot3Prods),
    mid3ProdMin:     Math.min(...mid3Prods),   mid3ProdMax:   Math.max(...mid3Prods),
    adjProdSumMin:   Math.min(...adjProdSums), adjProdSumMax: Math.max(...adjProdSums),
    sumMod7Min:      Math.min(...sumMod7s),    sumMod7Max:    Math.max(...sumMod7s),
    sumMod11Min:     Math.min(...sumMod11s),   sumMod11Max:   Math.max(...sumMod11s),
    prodN03Max:      Math.max(...prodN03s),
    prodN13Max:      Math.max(...prodN13s),
    prodN24Max:      Math.max(...prodN24s),
    gapSmoothMax:    Math.max(...gapSmooths),
    digitProdMin:    Math.min(...digitProds),  digitProdMax:  Math.max(...digitProds),
    s034Min:         Math.min(...s034s),       s034Max:       Math.max(...s034s),
    s123Min:         Math.min(...s123s),       s123Max:       Math.max(...s123s),
    s0235Min:        Math.min(...s0235s),      s0235Max:      Math.max(...s0235s),
    mod10DistMin:    Math.min(...mod10Dists),  mod10DistMax:  Math.max(...mod10Dists),
    mod7DistMin:     Math.min(...mod7Dists),   mod7DistMax:   Math.max(...mod7Dists),
    mod9DistMin:     Math.min(...mod9Dists),   mod9DistMax:   Math.max(...mod9Dists),
    mod11DistMin:    Math.min(...mod11Dists),  mod11DistMax:  Math.max(...mod11Dists),
    mod13DistMin:    Math.min(...mod13Dists),  mod13DistMax:  Math.max(...mod13Dists),
    gcdPairsMin:     Math.min(...gcdPairs),    gcdPairsMax:   Math.max(...gcdPairs),
    tensDistMin:     Math.min(...tensDists),   tensDistMax:   Math.max(...tensDists),
    maxPairGcdMin:   Math.min(...maxPairGcds), maxPairGcdMax: Math.max(...maxPairGcds),
    palindProdSumMin: Math.min(...palindProdSums), palindProdSumMax: Math.max(...palindProdSums),
    crossProdSumMin:  Math.min(...crossProdSums),  crossProdSumMax:  Math.max(...crossProdSums),
    digitSumDistMin: Math.min(...digitSumDists), digitSumDistMax: Math.max(...digitSumDists),
    oddRunMaxMax:    Math.max(...oddRunMaxs),
    sigmaSumMin:     Math.min(...sigmaSums),     sigmaSumMax:    Math.max(...sigmaSums),
    phiSumMin:       Math.min(...phiSums),       phiSumMax:      Math.max(...phiSums),
    pairGcdSumMin:   Math.min(...pairGcdSums),   pairGcdSumMax:  Math.max(...pairGcdSums),
    tauSumMin:       Math.min(...tauSums),       tauSumMax:      Math.max(...tauSums),
    squarefreeMax:   Math.max(...squarefrees),
    bigOmegaSumMin:  Math.min(...bigOmegaSums),  bigOmegaSumMax: Math.max(...bigOmegaSums),
    omegaSumMin:     Math.min(...omegaSums),     omegaSumMax:    Math.max(...omegaSums),
    gpfSumMin:       Math.min(...gpfSums),       gpfSumMax:      Math.max(...gpfSums),
    lpfSumMin:       Math.min(...lpfSums),       lpfSumMax:      Math.max(...lpfSums),
    muSumMin:        Math.min(...muSums),        muSumMax:       Math.max(...muSums),
    popcountSumMin:  Math.min(...popcountSums),  popcountSumMax: Math.max(...popcountSums),
    bitLenSumMin:    Math.min(...bitLenSums),    bitLenSumMax:   Math.max(...bitLenSums),
    tzSumMin:        Math.min(...tzSums),        tzSumMax:       Math.max(...tzSums),
    popcountDistMin: Math.min(...popcountDists), popcountDistMax: Math.max(...popcountDists),
    bitLenDistMin:   Math.min(...bitLenDists),   bitLenDistMax:  Math.max(...bitLenDists),
    digitSumSumMin:    Math.min(...digitSumSums),  digitSumSumMax: Math.max(...digitSumSums),
    digitSumMaxMin:    Math.min(...digitSumMaxes), digitSumMaxMax: Math.max(...digitSumMaxes),
    digitSumMinMin:    Math.min(...digitSumMins),  digitSumMinMax: Math.max(...digitSumMins),
    maxDigitMin:       Math.min(...maxDigits),     maxDigitMax:    Math.max(...maxDigits),
    distinctDigitsMin: Math.min(...distinctDigs),  distinctDigitsMax: Math.max(...distinctDigs),
    altSumMin:         Math.min(...altSums),       altSumMax:         Math.max(...altSums),
    qPosAscMin:        Math.min(...qPosAscs),      qPosAscMax:        Math.max(...qPosAscs),
    qPosDescMin:       Math.min(...qPosDescs),     qPosDescMax:       Math.max(...qPosDescs),
    vWeightMin:        Math.min(...vWeights),      vWeightMax:        Math.max(...vWeights),
    lWeightMin:        Math.min(...lWeights),      lWeightMax:        Math.max(...lWeights),
    gapAccelMin:       Math.min(...gapAccels),     gapAccelMax:       Math.max(...gapAccels),
    primeWMin:         Math.min(...primeWs),       primeWMax:         Math.max(...primeWs),
    fibWMin:           Math.min(...fibWs),         fibWMax:           Math.max(...fibWs),
    bellWMin:          Math.min(...bellWs),        bellWMax:          Math.max(...bellWs),
    triWMin:           Math.min(...triWs),         triWMax:           Math.max(...triWs),
    mod15SumMin:       Math.min(...mod15Sums),     mod15SumMax:       Math.max(...mod15Sums),
    mod17SumMin:       Math.min(...mod17Sums),     mod17SumMax:       Math.max(...mod17Sums),
    minDigitMin:       Math.min(...minDigits),     minDigitMax:       Math.max(...minDigits),
    sqWMin:            Math.min(...sqWs),          sqWMax:            Math.max(...sqWs),
    cubWMin:           Math.min(...cubWs),         cubWMax:           Math.max(...cubWs),
    zones,
    freq,
  };
}

// ─── RULES TABLE ─────────────────────────────────────────────────────────────

interface Rule {
  name: string;
  get: (n: number[], s: Stats) => number;
  lo: (s: Stats) => number | null;  // null = no lower bound
  hi: (s: Stats) => number | null;  // null = no upper bound
}

const RULES: Rule[] = [
  // ── 기본 분포 ──────────────────────────────────────────────────────────────
  { name: '합계',              get: (n)=>sumNums(n),      lo:s=>s.sumMin,      hi:s=>s.sumMax },
  { name: '스팬',              get: (n)=>numRange(n),     lo:s=>s.rangeMin,    hi:s=>s.rangeMax },
  { name: '홀수 개수',         get: (n)=>oddCount(n),     lo:s=>s.oddMin,      hi:s=>s.oddMax },
  { name: '연속쌍',            get: (n)=>consecPairs(n),  lo:()=>null,         hi:s=>s.consecMax },
  { name: '최대인접간격',      get: (n)=>maxGap(n),       lo:s=>s.maxGapMin,   hi:s=>s.maxGapMax },
  { name: '2번째큰간격',      get: (n)=>gap2nd(n),       lo:()=>null,         hi:s=>s.gap2ndMax },
  { name: '최소인접간격',      get: (n)=>minGapFn(n),     lo:()=>null,         hi:s=>s.minGapMax },
  // ── 위치별 범위 ────────────────────────────────────────────────────────────
  { name: '최솟값(pos1)',      get: (n)=>n[0],            lo:s=>s.posMin[0],   hi:s=>s.posMax[0] },
  { name: '2번째(pos2)',       get: (n)=>n[1],            lo:s=>s.posMin[1],   hi:s=>s.posMax[1] },
  { name: '3번째(pos3)',       get: (n)=>n[2],            lo:s=>s.posMin[2],   hi:s=>s.posMax[2] },
  { name: '4번째(pos4)',       get: (n)=>n[3],            lo:s=>s.posMin[3],   hi:s=>s.posMax[3] },
  { name: '5번째(pos5)',       get: (n)=>n[4],            lo:s=>s.posMin[4],   hi:s=>s.posMax[4] },
  { name: '최댓값(pos6)',      get: (n)=>n[5],            lo:s=>s.posMin[5],   hi:s=>s.posMax[5] },
  // ── 인접 간격 상한 ─────────────────────────────────────────────────────────
  { name: '간격[1-2]',         get: (n)=>n[1]-n[0],       lo:()=>null,         hi:s=>s.gapMax[0] },
  { name: '간격[2-3]',         get: (n)=>n[2]-n[1],       lo:()=>null,         hi:s=>s.gapMax[1] },
  { name: '간격[3-4]',         get: (n)=>n[3]-n[2],       lo:()=>null,         hi:s=>s.gapMax[2] },
  { name: '간격[4-5]',         get: (n)=>n[4]-n[3],       lo:()=>null,         hi:s=>s.gapMax[3] },
  { name: '간격[5-6]',         get: (n)=>n[5]-n[4],       lo:()=>null,         hi:s=>s.gapMax[4] },
  // ── 부분합 범위 ────────────────────────────────────────────────────────────
  { name: '최솟+최댓값 합',    get: (n)=>n[0]+n[5],       lo:s=>s.minMaxSumMin, hi:s=>s.minMaxSumMax },
  { name: '하위2개합(p1+2)',   get: (n)=>n[0]+n[1],        lo:s=>s.low2Min,     hi:s=>s.low2Max },
  { name: '상위2개합(p5+6)',   get: (n)=>n[4]+n[5],        lo:s=>s.hi2Min,      hi:s=>s.hi2Max },
  { name: '중간값 합(pos3+4)', get: (n)=>n[2]+n[3],       lo:s=>s.midSumMin,   hi:s=>s.midSumMax },
  { name: '하위3개합(p1+2+3)', get: (n)=>n[0]+n[1]+n[2],      lo:s=>s.low3Min,     hi:s=>s.low3Max },
  { name: '상위3개합(p4+5+6)', get: (n)=>n[3]+n[4]+n[5],      lo:s=>s.hi3Min,      hi:s=>s.hi3Max },
  { name: '하위4개합(p1-4)',   get: (n)=>n[0]+n[1]+n[2]+n[3], lo:s=>s.low4Min,     hi:s=>s.low4Max },
  { name: '상위4개합(p3-6)',   get: (n)=>n[2]+n[3]+n[4]+n[5], lo:s=>s.hi4Min,      hi:s=>s.hi4Max },
  { name: '중간4개합(p2-5)',   get: (n)=>n[1]+n[2]+n[3]+n[4], lo:s=>s.mid4Min,     hi:s=>s.mid4Max },
  // ── 부분 스팬 범위 ──────────────────────────────────────────────────────────
  { name: '스팬(pos1-3)',     get: (n)=>n[2]-n[0],            lo:s=>s.span3LoMin,  hi:s=>s.span3LoMax },
  { name: '스팬(pos2-4)',     get: (n)=>n[3]-n[1],            lo:s=>s.span2nMin,   hi:s=>s.span2nMax },
  { name: '스팬(pos3-5)',     get: (n)=>n[4]-n[2],            lo:s=>s.span3nMin,   hi:s=>s.span3nMax },
  { name: '스팬(pos4-6)',     get: (n)=>n[5]-n[3],            lo:s=>s.span3HiMin,  hi:s=>s.span3HiMax },
  { name: '스팬(pos2-5)',     get: (n)=>n[4]-n[1],            lo:s=>s.span4MidMin, hi:s=>s.span4MidMax },
  { name: '홀수위치합(p1+3+5)', get: (n)=>n[0]+n[2]+n[4],   lo:s=>s.oddPosMin,   hi:s=>s.oddPosMax },
  { name: '짝수위치합(p2+4+6)', get: (n)=>n[1]+n[3]+n[5],   lo:s=>s.evenPosMin,  hi:s=>s.evenPosMax },
  { name: '번호제곱합',       get: (n)=>sqSum(n),             lo:s=>s.sqSumMin,    hi:s=>s.sqSumMax },
  // ── 위치쌍 합 ──────────────────────────────────────────────────────────────
  { name: 'n[1]+n[5] 합',     get: (n)=>n[1]+n[5],            lo:s=>s.n15Min,      hi:s=>s.n15Max },
  { name: 'n[2]+n[5] 합',     get: (n)=>n[2]+n[5],            lo:s=>s.n25Min,      hi:s=>s.n25Max },
  { name: 'n[1]+n[3] 합',     get: (n)=>n[1]+n[3],            lo:s=>s.n13Min,      hi:s=>s.n13Max },
  { name: 'n[1]+n[2]+n[4]+n[5]', get: (n)=>n[1]+n[2]+n[4]+n[5], lo:s=>s.s1245Min, hi:s=>s.s1245Max },
  // ── 자리수 기반 ────────────────────────────────────────────────────────────
  { name: '10의자리 합',       get: (n)=>tenSum(n),            lo:s=>s.tensMin,     hi:s=>s.tensMax },
  { name: '1의자리 합',        get: (n)=>oneSum(n),            lo:s=>s.onesMin,     hi:s=>s.onesMax },
  { name: '세제곱합',          get: (n)=>cubSum(n),            lo:s=>s.cubSumMin,   hi:s=>s.cubSumMax },
  // ── gap 조합 합 ────────────────────────────────────────────────────────────
  { name: '외부gap합(g01+g45)', get: (n)=>gapOuter(n),        lo:()=>null,         hi:s=>s.gapOuterMax },
  { name: '내부gap합(g12+g34)', get: (n)=>gapInner(n),        lo:()=>null,         hi:s=>s.gapInnerMax },
  // ── 추가 부분 스팬 ─────────────────────────────────────────────────────────
  { name: '스팬(pos1-4)',      get: (n)=>n[3]-n[0],            lo:s=>s.span1to4Min, hi:s=>s.span1to4Max },
  { name: '스팬(pos3-6)',      get: (n)=>n[5]-n[2],            lo:s=>s.span3to6Min, hi:s=>s.span3to6Max },
  { name: '스팬(pos1-5)',      get: (n)=>n[4]-n[0],            lo:s=>s.span1to5Min, hi:s=>s.span1to5Max },
  { name: '스팬(pos2-6)',      get: (n)=>n[5]-n[1],            lo:s=>s.span2to6Min, hi:s=>s.span2to6Max },
  // ── 추가 위치쌍 합 ─────────────────────────────────────────────────────────
  { name: 'n[0]+n[2] 합',     get: (n)=>n[0]+n[2],            lo:s=>s.n02Min,      hi:s=>s.n02Max },
  { name: 'n[0]+n[4] 합',     get: (n)=>n[0]+n[4],            lo:s=>s.n04Min,      hi:s=>s.n04Max },
  { name: 'n[1]+n[4] 합',     get: (n)=>n[1]+n[4],            lo:s=>s.n14Min,      hi:s=>s.n14Max },
  { name: 'n[2]+n[4] 합',     get: (n)=>n[2]+n[4],            lo:s=>s.n24Min,      hi:s=>s.n24Max },
  { name: 'n[3]+n[4] 합',     get: (n)=>n[3]+n[4],            lo:s=>s.n34Min,      hi:s=>s.n34Max },
  // ── 3항 위치합 ─────────────────────────────────────────────────────────────
  { name: 'n[0]+n[1]+n[3]',  get: (n)=>n[0]+n[1]+n[3],       lo:s=>s.s013Min,     hi:s=>s.s013Max },
  { name: 'n[0]+n[1]+n[4]',  get: (n)=>n[0]+n[1]+n[4],       lo:s=>s.s014Min,     hi:s=>s.s014Max },
  { name: 'n[0]+n[2]+n[3]',  get: (n)=>n[0]+n[2]+n[3],       lo:s=>s.s023Min,     hi:s=>s.s023Max },
  { name: 'n[1]+n[3]+n[5]',  get: (n)=>n[1]+n[3]+n[5],       lo:s=>s.s135Min,     hi:s=>s.s135Max },
  { name: 'n[0]+n[2]+n[5]',  get: (n)=>n[0]+n[2]+n[5],       lo:s=>s.s025Min,     hi:s=>s.s025Max },
  { name: 'n[0]+n[3]+n[5]',  get: (n)=>n[0]+n[3]+n[5],       lo:s=>s.s035Min,     hi:s=>s.s035Max },
  { name: 'n[1]+n[2]+n[4]',  get: (n)=>n[1]+n[2]+n[4],       lo:s=>s.s124Min,     hi:s=>s.s124Max },
  { name: 'n[0]+n[1]+n[5]',  get: (n)=>n[0]+n[1]+n[5],       lo:s=>s.s015Min,     hi:s=>s.s015Max },
  { name: 'n[2]+n[3]+n[5]',  get: (n)=>n[2]+n[3]+n[5],       lo:s=>s.s235Min,     hi:s=>s.s235Max },
  { name: 'n[1]+n[2]+n[5]',  get: (n)=>n[1]+n[2]+n[5],       lo:s=>s.s125Min,     hi:s=>s.s125Max },
  // ── 4항 위치합 ─────────────────────────────────────────────────────────────
  { name: 'n[0]+n[1]+n[2]+n[5]', get: (n)=>n[0]+n[1]+n[2]+n[5], lo:s=>s.s0125Min, hi:s=>s.s0125Max },
  { name: 'n[0]+n[1]+n[4]+n[5]', get: (n)=>n[0]+n[1]+n[4]+n[5], lo:s=>s.s0145Min, hi:s=>s.s0145Max },
  { name: 'n[0]+n[2]+n[4]+n[5]', get: (n)=>n[0]+n[2]+n[4]+n[5], lo:s=>s.s0245Min, hi:s=>s.s0245Max },
  { name: 'n[1]+n[3]+n[4]+n[5]', get: (n)=>n[1]+n[3]+n[4]+n[5], lo:s=>s.s1345Min, hi:s=>s.s1345Max },
  // ── 교차 gap 합 ────────────────────────────────────────────────────────────
  { name: 'gap[0]+gap[2]',      get: (n)=>(n[1]-n[0])+(n[3]-n[2]), lo:()=>null, hi:s=>s.gapAlt02Max },
  { name: 'gap[1]+gap[3]',      get: (n)=>(n[2]-n[1])+(n[4]-n[3]), lo:()=>null, hi:s=>s.gapAlt13Max },
  { name: 'gap[0]+gap[3]',      get: (n)=>(n[1]-n[0])+(n[4]-n[3]), lo:()=>null, hi:s=>s.gapSkip03Max },
  { name: 'gap[1]+gap[4]',      get: (n)=>(n[2]-n[1])+(n[5]-n[4]), lo:()=>null, hi:s=>s.gapSkip14Max },
  { name: 'gap[2]+gap[4]',      get: (n)=>(n[3]-n[2])+(n[5]-n[4]), lo:()=>null, hi:s=>s.gapSkip24Max },
  // ── 비선형 gap 패턴 ────────────────────────────────────────────────────────
  { name: '간격 제곱합',        get: (n)=>[0,1,2,3,4].reduce((a,i)=>a+(n[i+1]-n[i])**2,0), lo:s=>s.gapSqSumMin, hi:s=>s.gapSqSumMax },
  { name: 'gap[0]+[2]+[4]',    get: (n)=>(n[1]-n[0])+(n[3]-n[2])+(n[5]-n[4]), lo:()=>null, hi:s=>s.gap024Max },
  { name: 'gap[0]+[1]+[3]',    get: (n)=>(n[1]-n[0])+(n[2]-n[1])+(n[4]-n[3]), lo:()=>null, hi:s=>s.gap013Max },
  { name: 'gap[0]+[1]+[4]',    get: (n)=>(n[1]-n[0])+(n[2]-n[1])+(n[5]-n[4]), lo:()=>null, hi:s=>s.gap014Max },
  { name: 'gap[1]+[2]+[4]',    get: (n)=>(n[2]-n[1])+(n[3]-n[2])+(n[5]-n[4]), lo:()=>null, hi:s=>s.gap124Max },
  { name: 'gap[0]+[3]+[4]',    get: (n)=>(n[1]-n[0])+(n[4]-n[3])+(n[5]-n[4]), lo:()=>null, hi:s=>s.gap034Max },
  // ── 간격 범위 + 4-gap 교차 ─────────────────────────────────────────────────
  { name: '간격범위(max-min)', get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]); return Math.max(...g)-Math.min(...g); }, lo:()=>null, hi:s=>s.gapRangeMax },
  { name: 'gap[0]+[1]+[2]+[4]', get: (n)=>(n[3]-n[0])+(n[5]-n[4]), lo:()=>null, hi:s=>s.gap0124Max },
  { name: 'gap[0]+[1]+[3]+[4]', get: (n)=>(n[2]-n[0])+(n[5]-n[3]), lo:()=>null, hi:s=>s.gap0134Max },
  { name: 'gap[0]+[2]+[3]+[4]', get: (n)=>(n[1]-n[0])+(n[5]-n[2]), lo:()=>null, hi:s=>s.gap0234Max },
  { name: '간격하위2합',        get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[0]+g[1]; }, lo:()=>null, hi:s=>s.gapBot2Max },
  { name: '간격상위2합',        get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[3]+g[4]; }, lo:s=>s.gapTop2Min, hi:()=>null },
  // ── 정렬 간격 통계 ─────────────────────────────────────────────────────────
  { name: '간격중앙값(정렬[2])', get: (n)=>[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b)[2], lo:s=>s.gapSortedMedMin, hi:s=>s.gapSortedMedMax },
  { name: '정렬간격[1]',        get: (n)=>[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b)[1], lo:()=>null, hi:s=>s.gapSorted1Max },
  { name: '정렬간격[3]',        get: (n)=>[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b)[3], lo:()=>null, hi:s=>s.gapSorted3Max },
  { name: '간격중간3합(정렬)',  get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[1]+g[2]+g[3]; }, lo:s=>s.gapMid3SumMin, hi:s=>s.gapMid3SumMax },
  { name: '중앙3간격최대',      get: (n)=>Math.max(n[2]-n[1],n[3]-n[2],n[4]-n[3]), lo:()=>null, hi:s=>s.gapMidMaxMax },
  // ── 정렬 간격 추가 조합 ────────────────────────────────────────────────────
  { name: '정렬간격하위3합',   get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[0]+g[1]+g[2]; }, lo:()=>null, hi:s=>s.gapBot3Max },
  { name: '정렬간격상위3합',   get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[2]+g[3]+g[4]; }, lo:s=>s.gapTop3Min, hi:()=>null },
  { name: '정렬간격[0]+[4]',  get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[0]+g[4]; }, lo:()=>null, hi:s=>s.gapS04Max },
  { name: '정렬간격[0]+[2]',  get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[0]+g[2]; }, lo:()=>null, hi:s=>s.gapS02Max },
  { name: '정렬간격[1]+[4]',  get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]).sort((a,b)=>a-b); return g[1]+g[4]; }, lo:()=>null, hi:s=>s.gapS14Max },
  // ── 값 기반 분류 합 ────────────────────────────────────────────────────────
  { name: '홀수번호합',        get: (n)=>n.filter(x=>x%2===1).reduce((a,b)=>a+b,0), lo:s=>s.oddNumSumMin, hi:s=>s.oddNumSumMax },
  { name: '짝수번호합',        get: (n)=>n.filter(x=>x%2===0).reduce((a,b)=>a+b,0), lo:()=>null,         hi:s=>s.evenNumSumMax },
  { name: '하위절반합(≤22)',  get: (n)=>n.filter(x=>x<=22).reduce((a,b)=>a+b,0),   lo:()=>null,         hi:s=>s.loHalfSumMax },
  { name: '상위절반합(≥23)',  get: (n)=>n.filter(x=>x>=23).reduce((a,b)=>a+b,0),   lo:s=>s.hiHalfSumMin, hi:()=>null },
  { name: '극값곱(n0×n5)',    get: (n)=>n[0]*n[5],                                  lo:()=>null,         hi:s=>s.extremeProdMax },
  // ── 값 분류 합 추가 ────────────────────────────────────────────────────────
  { name: '소수번호합',        get: (n)=>n.filter(x=>PRIMES.has(x)).reduce((a,b)=>a+b,0), lo:()=>null, hi:s=>s.primeSumMax },
  { name: '3배수번호합',       get: (n)=>n.filter(x=>MULT3.has(x)).reduce((a,b)=>a+b,0),  lo:()=>null, hi:s=>s.mult3SumMax },
  { name: '하위3분의1합(≤15)', get: (n)=>n.filter(x=>x<=15).reduce((a,b)=>a+b,0),         lo:()=>null, hi:s=>s.loThirdSumMax },
  { name: '중간3분의1합(16-30)',get: (n)=>n.filter(x=>x>=16&&x<=30).reduce((a,b)=>a+b,0), lo:()=>null, hi:s=>s.midThirdSumMax },
  { name: '상위3분의1합(≥31)', get: (n)=>n.filter(x=>x>=31).reduce((a,b)=>a+b,0),         lo:s=>s.hiThirdSumMin, hi:()=>null },
  // ── 특수집합 합 + 위치쌍 곱 ───────────────────────────────────────────────
  { name: '완전제곱수합',      get: (n)=>n.filter(x=>PERF_SQ.has(x)).reduce((a,b)=>a+b,0), lo:()=>null, hi:s=>s.perfSqSumMax },
  { name: '피보나치번호합',    get: (n)=>n.filter(x=>FIBS.has(x)).reduce((a,b)=>a+b,0),    lo:()=>null, hi:s=>s.fibSumMax },
  { name: 'n[0]×n[1] 곱',    get: (n)=>n[0]*n[1],                                        lo:()=>null, hi:s=>s.prodLo2Max },
  { name: 'n[4]×n[5] 곱',    get: (n)=>n[4]*n[5],                                        lo:()=>null, hi:s=>s.prodHi2Max },
  { name: 'n[2]×n[3] 곱',    get: (n)=>n[2]*n[3],                                        lo:()=>null, hi:s=>s.prodMid2Max },
  // ── 교차 위치 곱 + 7의배수 ────────────────────────────────────────────────
  { name: 'n[0]×n[2] 곱',    get: (n)=>n[0]*n[2],                                        lo:()=>null, hi:s=>s.prodN02Max },
  { name: 'n[1]×n[5] 곱',    get: (n)=>n[1]*n[5],                                        lo:()=>null, hi:s=>s.prodN15Max },
  { name: 'n[3]×n[5] 곱',    get: (n)=>n[3]*n[5],                                        lo:()=>null, hi:s=>s.prodN35Max },
  { name: '7의배수 개수',     get: (n)=>n.filter(x=>[7,14,21,28,35,42].includes(x)).length, lo:()=>null, hi:s=>s.multOf7Max },
  { name: '7배수번호합',      get: (n)=>n.filter(x=>[7,14,21,28,35,42].includes(x)).reduce((a,b)=>a+b,0), lo:()=>null, hi:s=>s.mult7SumMax },
  // ── 위치가중합 + 구조 패턴 ────────────────────────────────────────────────
  { name: '위치가중합(오름)', get: (n)=>n.reduce((a,x,i)=>a+(i+1)*x,0), lo:s=>s.weightedSumAscMin,  hi:s=>s.weightedSumAscMax },
  { name: '위치가중합(내림)', get: (n)=>n.reduce((a,x,i)=>a+(6-i)*x,0), lo:s=>s.weightedSumDescMin, hi:s=>s.weightedSumDescMax },
  { name: '등차트리플 개수',  get: (n)=>{ let c=0; for(let i=0;i<4;i++) for(let j=i+1;j<5;j++) for(let k=j+1;k<6;k++) if(n[j]-n[i]===n[k]-n[j]) c++; return c; }, lo:()=>null, hi:s=>s.arithTripleMax },
  { name: '근접간격≤2 개수', get: (n)=>{ let c=0; for(let i=0;i<5;i++) if(n[i+1]-n[i]<=2) c++; return c; }, lo:()=>null, hi:s=>s.closeGap2Max },
  { name: '제곱근합(floor)', get: (n)=>n.reduce((a,x)=>a+Math.floor(Math.sqrt(x)),0), lo:()=>null, hi:s=>s.sumOfRootsMax },
  // ── 자리수합 + 특수집합 + 외내차 + 연속3 ─────────────────────────────────
  { name: '자리수합',         get: (n)=>n.reduce((a,x)=>a+(x%10)+Math.floor(x/10),0), lo:s=>s.digitSumMin, hi:s=>s.digitSumMax },
  { name: '삼각수 개수',      get: (n)=>n.filter(x=>TRI.has(x)).length, lo:()=>null, hi:s=>s.triMax },
  { name: '4의배수 개수',     get: (n)=>n.filter(x=>MULT4.has(x)).length, lo:()=>null, hi:s=>s.mult4Max },
  { name: '외내차(p1+6-p3-4)', get: (n)=>(n[0]+n[5])-(n[2]+n[3]), lo:s=>s.extOuterMidMin, hi:s=>s.extOuterMidMax },
  { name: '연속3 개수',       get: (n)=>{ let c=0; for(let i=0;i<4;i++) if(n[i+2]-n[i]===2) c++; return c; }, lo:()=>null, hi:s=>s.tripleConsecMax },
  // ── mod 합 + 상하차 + 중심거리 + 간격 곱 (cycle 2/15) ──────────────────────
  { name: 'mod5 합',          get: (n)=>n.reduce((a,x)=>a+(x%5),0), lo:s=>s.mod5SumMin, hi:s=>s.mod5SumMax },
  { name: 'mod7 합',          get: (n)=>n.reduce((a,x)=>a+(x%7),0), lo:s=>s.mod7SumMin, hi:s=>s.mod7SumMax },
  { name: '상하3합차',        get: (n)=>(n[3]+n[4]+n[5])-(n[0]+n[1]+n[2]), lo:s=>s.topBotDiffMin, hi:s=>s.topBotDiffMax },
  { name: '중심거리합',       get: (n)=>n.reduce((a,x)=>a+Math.abs(x-23),0), lo:s=>s.centerDistMin, hi:s=>s.centerDistMax },
  { name: '간격 곱',          get: (n)=>[0,1,2,3,4].reduce((a,i)=>a*(n[i+1]-n[i]),1), lo:s=>s.gapProdMin, hi:s=>s.gapProdMax },
  // ── mod4/9/11 합 + 번호분산 + 간격분산 (cycle 3/15) ────────────────────────
  { name: 'mod4 합',          get: (n)=>n.reduce((a,x)=>a+(x%4),0), lo:s=>s.mod4SumMin, hi:s=>s.mod4SumMax },
  { name: 'mod9 합',          get: (n)=>n.reduce((a,x)=>a+(x%9),0), lo:s=>s.mod9SumMin, hi:s=>s.mod9SumMax },
  { name: 'mod11 합',         get: (n)=>n.reduce((a,x)=>a+(x%11),0), lo:s=>s.mod11SumMin, hi:s=>s.mod11SumMax },
  { name: '번호분산(6Σn²-Σ²)', get: (n)=>{ const s=n.reduce((a,x)=>a+x,0); const sq=n.reduce((a,x)=>a+x*x,0); return 6*sq - s*s; }, lo:s=>s.varNumMin, hi:s=>s.varNumMax },
  { name: '간격분산(5Σg²-Σ²)', get: (n)=>{ const gs=[0,1,2,3,4].map(i=>n[i+1]-n[i]); const s=gs.reduce((a,x)=>a+x,0); const sq=gs.reduce((a,x)=>a+x*x,0); return 5*sq - s*s; }, lo:s=>s.varGapMin, hi:s=>s.varGapMax },
  // ── mod6/8/13 합 + 상위3곱 + 합자리수합 (cycle 4/15) ───────────────────────
  { name: 'mod6 합',          get: (n)=>n.reduce((a,x)=>a+(x%6),0), lo:s=>s.mod6SumMin, hi:s=>s.mod6SumMax },
  { name: 'mod8 합',          get: (n)=>n.reduce((a,x)=>a+(x%8),0), lo:s=>s.mod8SumMin, hi:s=>s.mod8SumMax },
  { name: 'mod13 합',         get: (n)=>n.reduce((a,x)=>a+(x%13),0), lo:s=>s.mod13SumMin, hi:s=>s.mod13SumMax },
  { name: '상위3개 곱',       get: (n)=>n[3]*n[4]*n[5], lo:s=>s.top3ProdMin, hi:s=>s.top3ProdMax },
  { name: '합 자리수합',      get: (n)=>{ const s=n.reduce((a,x)=>a+x,0); return (s%10)+Math.floor(s/100)+Math.floor((s/10)%10); }, lo:s=>s.sumDigitSumMin, hi:s=>s.sumDigitSumMax },
  // ── 하위3곱 + 중심3곱 + 인접곱합 + 합mod7 + 합mod11 (cycle 5/15) ───────────
  { name: '하위3개 곱',       get: (n)=>n[0]*n[1]*n[2], lo:s=>s.bot3ProdMin, hi:s=>s.bot3ProdMax },
  { name: '중심3개 곱',       get: (n)=>n[2]*n[3]*n[4], lo:s=>s.mid3ProdMin, hi:s=>s.mid3ProdMax },
  { name: '인접곱 합',        get: (n)=>n[0]*n[1]+n[1]*n[2]+n[2]*n[3]+n[3]*n[4]+n[4]*n[5], lo:s=>s.adjProdSumMin, hi:s=>s.adjProdSumMax },
  { name: '합 mod7',          get: (n)=>n.reduce((a,x)=>a+x,0)%7, lo:s=>s.sumMod7Min, hi:s=>s.sumMod7Max },
  { name: '합 mod11',         get: (n)=>n.reduce((a,x)=>a+x,0)%11, lo:s=>s.sumMod11Min, hi:s=>s.sumMod11Max },
  // ── n[0]·n[3] + n[1]·n[3] + n[2]·n[4] + 간격평탄도 + 자리수곱합 (cycle 6/15) ───
  { name: 'n[0]×n[3] 곱',    get: (n)=>n[0]*n[3], lo:()=>null, hi:s=>s.prodN03Max },
  { name: 'n[1]×n[3] 곱',    get: (n)=>n[1]*n[3], lo:()=>null, hi:s=>s.prodN13Max },
  { name: 'n[2]×n[4] 곱',    get: (n)=>n[2]*n[4], lo:()=>null, hi:s=>s.prodN24Max },
  { name: '간격평탄도',       get: (n)=>{ const g=[0,1,2,3,4].map(i=>n[i+1]-n[i]); return Math.abs(g[1]-g[0])+Math.abs(g[2]-g[1])+Math.abs(g[3]-g[2])+Math.abs(g[4]-g[3]); }, lo:()=>null, hi:s=>s.gapSmoothMax },
  { name: '자리수곱 합',      get: (n)=>n.reduce((a,x)=>a+Math.floor(x/10)*(x%10),0), lo:s=>s.digitProdMin, hi:s=>s.digitProdMax },
  // ── s034 + s123 + s0235 + mod10distinct + mod7distinct (cycle 7/15) ──────────
  { name: 'n[0]+n[3]+n[4]',  get: (n)=>n[0]+n[3]+n[4],         lo:s=>s.s034Min,    hi:s=>s.s034Max },
  { name: 'n[1]+n[2]+n[3]',  get: (n)=>n[1]+n[2]+n[3],         lo:s=>s.s123Min,    hi:s=>s.s123Max },
  { name: 'n[0]+n[2]+n[3]+n[5]', get: (n)=>n[0]+n[2]+n[3]+n[5], lo:s=>s.s0235Min,   hi:s=>s.s0235Max },
  { name: 'mod10 distinct', get: (n)=>new Set(n.map(x=>x%10)).size, lo:s=>s.mod10DistMin, hi:s=>s.mod10DistMax },
  { name: 'mod7 distinct',  get: (n)=>new Set(n.map(x=>x%7)).size,  lo:s=>s.mod7DistMin,  hi:s=>s.mod7DistMax },
  // ── mod9/11/13 distinct + GCD>1 페어 + tens distinct (cycle 8/15) ────────────
  { name: 'mod9 distinct',  get: (n)=>new Set(n.map(x=>x%9)).size,  lo:s=>s.mod9DistMin,  hi:s=>s.mod9DistMax },
  { name: 'mod11 distinct', get: (n)=>new Set(n.map(x=>x%11)).size, lo:s=>s.mod11DistMin, hi:s=>s.mod11DistMax },
  { name: 'mod13 distinct', get: (n)=>new Set(n.map(x=>x%13)).size, lo:s=>s.mod13DistMin, hi:s=>s.mod13DistMax },
  { name: 'GCD>1 페어수',   get: (n)=>{ const g=(a:number,b:number):number=>{while(b){[a,b]=[b,a%b];}return a;}; let c=0; for(let i=0;i<5;i++) for(let j=i+1;j<6;j++) if(g(n[i],n[j])>1) c++; return c; }, lo:s=>s.gcdPairsMin, hi:s=>s.gcdPairsMax },
  { name: 'tens distinct',  get: (n)=>new Set(n.map(x=>Math.floor(x/10))).size, lo:s=>s.tensDistMin, hi:s=>s.tensDistMax },
  // ── max pair GCD + palind prod sum + cross prod sum + digitSum distinct + odd run max (cycle 9/15) ───
  { name: '최대페어GCD',    get: (n)=>{ const g=(a:number,b:number):number=>{while(b){[a,b]=[b,a%b];}return a;}; let m=1; for(let i=0;i<5;i++) for(let j=i+1;j<6;j++){const v=g(n[i],n[j]); if(v>m) m=v;} return m; }, lo:s=>s.maxPairGcdMin, hi:s=>s.maxPairGcdMax },
  { name: '대칭곱합',       get: (n)=>n[0]*n[5]+n[1]*n[4]+n[2]*n[3], lo:s=>s.palindProdSumMin, hi:s=>s.palindProdSumMax },
  { name: '교차곱합',       get: (n)=>n[0]*n[3]+n[1]*n[4]+n[2]*n[5], lo:s=>s.crossProdSumMin, hi:s=>s.crossProdSumMax },
  { name: '자리수합 distinct', get: (n)=>new Set(n.map(x=>(x%10)+Math.floor(x/10))).size, lo:s=>s.digitSumDistMin, hi:s=>s.digitSumDistMax },
  { name: '홀수연속런 최대', get: (n)=>{ let m=0,c=0; for(const x of n){if(x%2===1){c++;if(c>m)m=c;}else c=0;} return m; }, lo:()=>null, hi:s=>s.oddRunMaxMax },
  // ── σ 합 + φ 합 + 페어GCD 총합 + τ 합 + squarefree 개수 (cycle 10/15) ──────
  { name: 'σ(약수합) 합',    get: (n)=>n.reduce((a,x)=>a+SIGMA[x],0), lo:s=>s.sigmaSumMin, hi:s=>s.sigmaSumMax },
  { name: 'φ(토션트) 합',    get: (n)=>n.reduce((a,x)=>a+PHI[x],0),   lo:s=>s.phiSumMin,   hi:s=>s.phiSumMax },
  { name: '페어GCD 총합',    get: (n)=>{ const g=(a:number,b:number):number=>{while(b){[a,b]=[b,a%b];}return a;}; let s=0; for(let i=0;i<5;i++) for(let j=i+1;j<6;j++) s+=g(n[i],n[j]); return s; }, lo:s=>s.pairGcdSumMin, hi:s=>s.pairGcdSumMax },
  { name: 'τ(약수개수) 합',  get: (n)=>n.reduce((a,x)=>a+TAU[x],0),   lo:s=>s.tauSumMin,   hi:s=>s.tauSumMax },
  { name: 'squarefree 개수', get: (n)=>n.filter(x=>SQUAREFREE.has(x)).length, lo:()=>null, hi:s=>s.squarefreeMax },

  // ── Ω 합 + ω 합 + gpf 합 + lpf 합 + μ 합 (cycle 11/15) ──────────────────────
  { name: 'Ω(소인수multiplicity) 합', get: (n)=>n.reduce((a,x)=>a+BIG_OMEGA[x],0), lo:s=>s.bigOmegaSumMin, hi:s=>s.bigOmegaSumMax },
  { name: 'ω(distinct소인수) 합',     get: (n)=>n.reduce((a,x)=>a+OMEGA[x],0),     lo:s=>s.omegaSumMin,    hi:s=>s.omegaSumMax },
  { name: 'gpf(최대소인수) 합',        get: (n)=>n.reduce((a,x)=>a+GPF[x],0),       lo:s=>s.gpfSumMin,      hi:s=>s.gpfSumMax },
  { name: 'lpf(최소소인수) 합',        get: (n)=>n.reduce((a,x)=>a+LPF[x],0),       lo:s=>s.lpfSumMin,      hi:s=>s.lpfSumMax },
  { name: 'μ(모비우스) 합',            get: (n)=>n.reduce((a,x)=>a+MU[x],0),        lo:s=>s.muSumMin,       hi:s=>s.muSumMax },
  // ── popcount 합 + bit length 합 + trailing zero 합 + popcount distinct + bit length distinct (cycle 12/15)
  { name: 'popcount 합',          get: (n)=>n.reduce((a,x)=>a+POPCOUNT[x],0),    lo:s=>s.popcountSumMin,  hi:s=>s.popcountSumMax },
  { name: 'bit length 합',        get: (n)=>n.reduce((a,x)=>a+BIT_LEN[x],0),     lo:s=>s.bitLenSumMin,    hi:s=>s.bitLenSumMax },
  { name: 'trailing zero 합',     get: (n)=>n.reduce((a,x)=>a+TZ[x],0),          lo:s=>s.tzSumMin,        hi:s=>s.tzSumMax },
  { name: 'popcount distinct',    get: (n)=>new Set(n.map(x=>POPCOUNT[x])).size, lo:s=>s.popcountDistMin, hi:s=>s.popcountDistMax },
  { name: 'bit length distinct',  get: (n)=>new Set(n.map(x=>BIT_LEN[x])).size,  lo:s=>s.bitLenDistMin,   hi:s=>s.bitLenDistMax },
  // ── 자리수합 합 + max + min + 각자리수 max + 각자리수 distinct (cycle 13/15)
  { name: '자리수합 합',          get: (n)=>n.reduce((a,x)=>a+(x%10)+Math.floor(x/10),0),               lo:s=>s.digitSumSumMin,    hi:s=>s.digitSumSumMax },
  { name: '자리수합 max',         get: (n)=>Math.max(...n.map(x=>(x%10)+Math.floor(x/10))),             lo:s=>s.digitSumMaxMin,    hi:s=>s.digitSumMaxMax },
  { name: '자리수합 min',         get: (n)=>Math.min(...n.map(x=>(x%10)+Math.floor(x/10))),             lo:s=>s.digitSumMinMin,    hi:s=>s.digitSumMinMax },
  { name: '각자리수 max',          get: (n)=>Math.max(...n.flatMap(x=>[Math.floor(x/10), x%10])),        lo:s=>s.maxDigitMin,       hi:s=>s.maxDigitMax },
  { name: '각자리수 distinct',     get: (n)=>new Set(n.flatMap(x=>[Math.floor(x/10), x%10])).size,        lo:s=>s.distinctDigitsMin, hi:s=>s.distinctDigitsMax },
  // ── 교번합 + 위치제곱가중합(오름/내림) + V형/Λ형 중심가중합 (cycle 14/15) ───
  { name: '교번합',                get: (n)=>n[0]-n[1]+n[2]-n[3]+n[4]-n[5],                              lo:s=>s.altSumMin,         hi:s=>s.altSumMax },
  { name: '위치제곱가중합(오름)', get: (n)=>n.reduce((a,x,i)=>a+i*i*x,0),                                lo:s=>s.qPosAscMin,        hi:s=>s.qPosAscMax },
  { name: '위치제곱가중합(내림)', get: (n)=>n.reduce((a,x,i)=>a+(5-i)*(5-i)*x,0),                        lo:s=>s.qPosDescMin,       hi:s=>s.qPosDescMax },
  { name: 'V형중심가중합',         get: (n)=>5*n[0]+3*n[1]+1*n[2]+1*n[3]+3*n[4]+5*n[5],                  lo:s=>s.vWeightMin,        hi:s=>s.vWeightMax },
  { name: 'Λ형중심가중합',         get: (n)=>1*n[0]+3*n[1]+5*n[2]+5*n[3]+3*n[4]+1*n[5],                  lo:s=>s.lWeightMin,        hi:s=>s.lWeightMax },
  // ── 간격가속제곱합 + 소수/피보나치/종모양/삼각수 가중합 (cycle 15/15) ───────
  { name: '간격가속제곱합',        get: (n)=>{ const g=[n[1]-n[0],n[2]-n[1],n[3]-n[2],n[4]-n[3],n[5]-n[4]]; return (g[1]-g[0])**2+(g[2]-g[1])**2+(g[3]-g[2])**2+(g[4]-g[3])**2; }, lo:s=>s.gapAccelMin, hi:s=>s.gapAccelMax },
  { name: '소수가중합',            get: (n)=>2*n[0]+3*n[1]+5*n[2]+7*n[3]+11*n[4]+13*n[5],                lo:s=>s.primeWMin,         hi:s=>s.primeWMax },
  { name: '피보나치가중합',        get: (n)=>1*n[0]+1*n[1]+2*n[2]+3*n[3]+5*n[4]+8*n[5],                  lo:s=>s.fibWMin,           hi:s=>s.fibWMax },
  { name: '종모양가중합',          get: (n)=>6*n[0]+10*n[1]+12*n[2]+12*n[3]+10*n[4]+6*n[5],              lo:s=>s.bellWMin,          hi:s=>s.bellWMax },
  { name: '삼각수가중합',          get: (n)=>1*n[0]+3*n[1]+6*n[2]+10*n[3]+15*n[4]+21*n[5],               lo:s=>s.triWMin,           hi:s=>s.triWMax },
  // ── mod15/17 합 + 각자리수 min + 정사각수/세제곱수 가중합 (cycle 16/?? 새 batch 1/5) ─
  { name: 'mod15 합',              get: (n)=>n.reduce((a,x)=>a+(x%15),0),                                lo:s=>s.mod15SumMin,       hi:s=>s.mod15SumMax },
  { name: 'mod17 합',              get: (n)=>n.reduce((a,x)=>a+(x%17),0),                                lo:s=>s.mod17SumMin,       hi:s=>s.mod17SumMax },
  { name: '각자리수 min',          get: (n)=>Math.min(...n.flatMap(x=>[Math.floor(x/10), x%10])),        lo:s=>s.minDigitMin,       hi:s=>s.minDigitMax },
  { name: '정사각수가중합',         get: (n)=>1*n[0]+4*n[1]+9*n[2]+16*n[3]+25*n[4]+36*n[5],                lo:s=>s.sqWMin,            hi:s=>s.sqWMax },
  { name: '세제곱수가중합',         get: (n)=>1*n[0]+8*n[1]+27*n[2]+64*n[3]+125*n[4]+216*n[5],             lo:s=>s.cubWMin,           hi:s=>s.cubWMax },
  // ── 추가 부분합 ────────────────────────────────────────────────────────────
  { name: '하위5개합(p1-5)',    get: (n)=>n[0]+n[1]+n[2]+n[3]+n[4], lo:s=>s.low5Min, hi:s=>s.low5Max },
  { name: '상위5개합(p2-6)',    get: (n)=>n[1]+n[2]+n[3]+n[4]+n[5], lo:s=>s.hi5Min,  hi:s=>s.hi5Max },
  { name: 'n[0]+n[3] 합',     get: (n)=>n[0]+n[3],            lo:s=>s.n03Min,      hi:s=>s.n03Max },
  { name: 'n[3]+n[5] 합',     get: (n)=>n[3]+n[5],            lo:s=>s.n35Min,      hi:()=>null },
  // ── 특수 패턴 ──────────────────────────────────────────────────────────────
  { name: '5의배수 개수',      get: (n)=>n.filter(x=>x%5===0).length,        lo:()=>null, hi:s=>s.multOf5Max },
  { name: '완전제곱수 개수',   get: (n)=>n.filter(x=>PERF_SQ.has(x)).length, lo:()=>null, hi:s=>s.perfSqMax },
  { name: '소수 개수',         get: (n)=>n.filter(x=>PRIMES.has(x)).length,   lo:()=>null, hi:s=>s.primesMax },
  { name: '최대연속런',        get: (n)=>{ let m=1,c=1; for(let i=1;i<6;i++){if(n[i]-n[i-1]===1){c++;if(c>m)m=c;}else c=1;} return m; }, lo:()=>null, hi:s=>s.maxRunMax },
  { name: '3의배수 개수',      get: (n)=>n.filter(x=>MULT3.has(x)).length,   lo:()=>null, hi:s=>s.multOf3Max },
  { name: '피보나치수 개수',   get: (n)=>n.filter(x=>FIBS.has(x)).length,    lo:()=>null, hi:s=>s.fibMax },
  { name: 'mod3 합',           get: (n)=>n.reduce((a,x)=>a+(x%3),0),         lo:s=>s.mod3SumMin, hi:s=>s.mod3SumMax },
  { name: '인접동일홀짝쌍수', get: (n)=>{ let c=0; for(let i=0;i<5;i++) if((n[i]%2)===(n[i+1]%2))c++; return c; }, lo:()=>null, hi:s=>s.samePairMax },
  // ── 구간별 개수 ────────────────────────────────────────────────────────────
  ...ZONES.map(([zoneLo, zoneHi], i) => ({
    name: `구간[${zoneLo}-${zoneHi}] 개수`,
    get: (n: number[]) => zoneCount(n, zoneLo, zoneHi),
    lo: (s: Stats) => s.zones[i].min,
    hi: (s: Stats) => s.zones[i].max,
  })),
  // ── 끝자리별 상한 ──────────────────────────────────────────────────────────
  ...([0,1,2,3,4,5,6,7,8,9].map(d => ({
    name: `끝자리${d} 개수`,
    get: (n: number[]) => n.filter(x=>x%10===d).length,
    lo: () => null,
    hi: (s: Stats) => s.lastDigMax[d],
  }))),
];

function checkRule(nums: number[], rule: Rule, stats: Stats): { pass: boolean; val: number } {
  const val = rule.get(nums, stats);
  const lo = rule.lo(stats);
  const hi = rule.hi(stats);
  const pass = (lo === null || val >= lo) && (hi === null || val <= hi);
  return { pass, val };
}

// ─── VALIDATE ────────────────────────────────────────────────────────────────

function isValid(nums: number[], s: Stats): boolean {
  for (const rule of RULES) {
    const { pass } = checkRule(nums, rule, s);
    if (!pass) return false;
  }
  return true;
}

// ─── ANALYZE ─────────────────────────────────────────────────────────────────

function printRulesTable(stats: Stats) {
  const bar = '═'.repeat(52);
  console.log(`\n${bar}`);
  console.log(`  100% 규칙 테이블 — ${stats.n}회차 (1~${stats.lastRound}회)`);
  console.log(`${bar}`);
  console.log(`  ${'규칙'.padEnd(18)} ${'하한'.padStart(6)} ${'상한'.padStart(6)}`);
  console.log(`  ${'-'.repeat(32)}`);
  for (const rule of RULES) {
    const lo = rule.lo(stats);
    const hi = rule.hi(stats);
    if (lo === null && hi === null) continue;
    const loStr = lo !== null ? String(lo) : '—';
    const hiStr = hi !== null ? String(hi) : '—';
    console.log(`  ${rule.name.padEnd(18)} ${loStr.padStart(6)} ${hiStr.padStart(6)}`);
  }
  console.log('');
}

function analyzePatterns(rounds: LottoRound[], stats: Stats) {
  printRulesTable(stats);

  const freq = stats.freq;
  const n = stats.n;
  const ranked = freq.slice(1).map((cnt,i)=>({num:i+1,cnt,pct:(cnt/n*100).toFixed(1)})).sort((a,b)=>b.cnt-a.cnt);

  console.log('◆ 빈도 상위 10');
  ranked.slice(0,10).forEach((r,i)=>
    console.log(`    ${String(i+1).padStart(2)}위  번호 ${String(r.num).padStart(2)}: ${r.cnt}회 (${r.pct}%)`));
  console.log('\n◆ 빈도 하위 10');
  ranked.slice(-10).reverse().forEach((r,i)=>
    console.log(`    ${String(i+1).padStart(2)}위  번호 ${String(r.num).padStart(2)}: ${r.cnt}회 (${r.pct}%)`));
  console.log('');
}

// ─── UPDATE + RULE VERIFY ────────────────────────────────────────────────────

async function update(): Promise<LottoRound[]> {
  if (!existsSync(DATA_FILE)) {
    console.log('데이터 없음. 전체 fetch 먼저...');
    return fetchAll();
  }

  const rounds: LottoRound[] = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  const oldLast = rounds[rounds.length - 1].round;
  console.log(`현재 데이터: ${rounds.length}회차 (최신 ${oldLast}회)\n`);

  const latest = await getLatestRound();
  if (!latest) { console.error('최신 회차 조회 실패'); return rounds; }
  if (latest <= oldLast) { console.log(`✅ 이미 최신 (${oldLast}회차)`); return rounds; }

  const newRoundNums = Array.from({length: latest - oldLast}, (_, i) => oldLast + 1 + i);
  console.log(`신규 ${newRoundNums.length}회차 발견: ${newRoundNums[0]}~${latest}회\n`);

  // 기존 stats 저장
  const oldStats = computeStats(rounds);

  // 신규 회차 수집
  const needed = new Set(newRoundNums);
  for (const r of newRoundNums) {
    const round = await fetchRoundFromAPI(r);
    if (round) { rounds.push(round); needed.delete(r); }
    await sleep(FETCH_DELAY_MS);
  }
  if (needed.size > 0) {
    const scraped = await fetchFromLottolyzer(new Set(needed));
    rounds.push(...scraped);
    needed.forEach(r => { if (!scraped.find(s=>s.round===r)) console.warn(`  ${r}회차 수집 실패`); });
  }
  rounds.sort((a,b)=>a.round-b.round);

  // 신규 회차별 규칙 검증
  const bar = '═'.repeat(56);
  for (const r of rounds.filter(r => newRoundNums.includes(r.round))) {
    console.log(`${bar}`);
    console.log(`  ${r.round}회차 (${r.date || '날짜미상'}): [${r.numbers.join(', ')}]`);
    console.log(`${bar}`);

    let allPass = true;
    for (const rule of RULES) {
      const { pass, val } = checkRule(r.numbers, rule, oldStats);
      const lo = rule.lo(oldStats);
      const hi = rule.hi(oldStats);
      if (!pass) {
        allPass = false;
        const bound = lo !== null && val < lo ? `하한 ${lo} 위반 (실제 ${val})` : `상한 ${hi} 위반 (실제 ${val})`;
        console.log(`  ❌ 규칙 위반: ${rule.name} — ${bound}`);
      }
    }
    if (allPass) console.log(`  ✅ 기존 규칙 전부 유지`);
    console.log('');
  }

  // 신규 stats 계산 + diff
  const newStats = computeStats(rounds);
  console.log(`${bar}`);
  console.log(`  규칙 변화 감지 (${oldStats.n}회차 → ${newStats.n}회차)`);
  console.log(`${bar}`);

  let changes = 0;
  for (const rule of RULES) {
    const oldLo = rule.lo(oldStats);
    const oldHi = rule.hi(oldStats);
    const newLo = rule.lo(newStats);
    const newHi = rule.hi(newStats);

    // 상한 완화 (기존 규칙 파괴)
    if (oldHi !== null && newHi !== null && newHi > oldHi) {
      console.log(`  ❌ ${rule.name} 상한 완화: ${oldHi} → ${newHi} (규칙 파괴)`);
      changes++;
    }
    // 하한 완화 (기존 규칙 파괴)
    if (oldLo !== null && newLo !== null && newLo < oldLo) {
      console.log(`  ❌ ${rule.name} 하한 완화: ${oldLo} → ${newLo} (규칙 파괴)`);
      changes++;
    }
    // 상한 강화 (새 규칙 발견)
    if (oldHi !== null && newHi !== null && newHi < oldHi) {
      console.log(`  🔒 ${rule.name} 상한 강화: ${oldHi} → ${newHi} (규칙 조여짐)`);
      changes++;
    }
    // 하한 강화 (새 규칙 발견)
    if (oldLo !== null && newLo !== null && newLo > oldLo) {
      console.log(`  🔒 ${rule.name} 하한 강화: ${oldLo} → ${newLo} (규칙 조여짐)`);
      changes++;
    }
  }
  if (changes === 0) console.log(`  ✅ 모든 규칙 경계 그대로 유지`);
  console.log('');

  writeFileSync(DATA_FILE, JSON.stringify(rounds, null, 2));
  console.log(`저장 완료: ${rounds.length}회차\n`);
  return rounds;
}

// ─── COUNT VALID ─────────────────────────────────────────────────────────────

function countValid(stats: Stats): { valid: number; total: number; elimPct: string } {
  const total = 8_145_060; // C(45,6)
  let valid = 0;
  for (let a = 1; a <= 40; a++)
  for (let b = a+1; b <= 41; b++)
  for (let c = b+1; c <= 42; c++)
  for (let d = c+1; d <= 43; d++)
  for (let e = d+1; e <= 44; e++)
  for (let f = e+1; f <= 45; f++) {
    if (isValid([a,b,c,d,e,f], stats)) valid++;
  }
  const elim = total - valid;
  const elimPct = (elim / total * 100).toFixed(2);
  return { valid, total, elimPct };
}

// ─── UNPOPULARITY SCORE ──────────────────────────────────────────────────────

const LUCKY_NUMS = new Set([3,7,11,13,17]);

function unpopularityScore(nums: number[]): number {
  let score = 0;
  score -= nums.filter(n => LUCKY_NUMS.has(n)).length * 3;
  score += consecPairs(nums) * 3;
  score += Math.abs(sumNums(nums) - 138) * 0.1;
  const gaps = nums.slice(1).map((n,i)=>n-nums[i]);
  if (gaps.every(g=>g===gaps[0])) score -= 10;
  const decades = nums.map(n=>Math.floor(n/10));
  if (decades.every(d=>d===decades[0])) score -= 5;
  const veryLow = nums.filter(n=>n<=9).length;
  if (veryLow >= 3) score -= veryLow * 2;
  return score;
}

// ─── PICK ────────────────────────────────────────────────────────────────────

function pick(rounds: LottoRound[], stats: Stats, count = 5): void {
  const bar = '═'.repeat(56);
  console.log(`${bar}`);
  console.log(`  추천 번호 ${count}세트`);
  console.log(`  필터1: 100% 규칙 (${RULES.length}개) / 필터2: 역대 당첨 제외 / 필터3: 기피점수`);
  console.log(`${bar}\n`);

  const pastWinners = new Set(rounds.map(r => r.numbers.join(',')));
  const candidates: Array<{nums: number[]; score: number}> = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (candidates.length < 50_000 && attempts < 2_000_000) {
    attempts++;
    const set = new Set<number>();
    while (set.size < 6) set.add(Math.floor(Math.random() * 45) + 1);
    const nums = [...set].sort((a,b)=>a-b);
    const key = nums.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    if (!isValid(nums, stats)) continue;
    if (pastWinners.has(key)) continue;
    candidates.push({ nums, score: unpopularityScore(nums) });
  }

  candidates.sort((a,b)=>b.score-a.score);
  const results = candidates.slice(0, count);

  console.log(`  후보 풀: ${candidates.length.toLocaleString()}개 (${attempts.toLocaleString()}회 시도)\n`);
  results.forEach(({nums, score}, i) => {
    const s = sumNums(nums);
    const oc = oddCount(nums);
    const cp = consecPairs(nums);
    console.log(
      `  세트 ${i+1}: [${nums.map(n=>String(n).padStart(2)).join('  ')}]` +
      `  합${String(s).padStart(3)} / 홀${oc}짝${6-oc} / 연속${cp}쌍 / 기피점수:${score.toFixed(1)}`
    );
  });
  console.log('');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] ?? 'all';
  const pickCount = Number(process.argv[3] ?? 5);

  let rounds: LottoRound[];

  if (mode === 'fetch') {
    rounds = await fetchAll();
  } else if (mode === 'update') {
    rounds = await update();
  } else {
    if (!existsSync(DATA_FILE)) {
      console.log('데이터 없음. 수집 시작...\n');
      rounds = await fetchAll();
    } else {
      rounds = JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as LottoRound[];
      console.log(`캐시 로드: ${rounds.length}회차\n`);
    }
  }

  const stats = computeStats(rounds);

  if (mode === 'rules') {
    printRulesTable(stats);
    return;
  }

  if (mode === 'count') {
    console.log(`규칙 ${RULES.length}개 적용 기준 유효 조합 계산 중...`);
    const t0 = Date.now();
    const { valid, total, elimPct } = countValid(stats);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n  전체 조합: ${total.toLocaleString()}`);
    console.log(`  유효 조합: ${valid.toLocaleString()}`);
    console.log(`  제거 조합: ${(total - valid).toLocaleString()} (${elimPct}%)`);
    console.log(`  소요: ${elapsed}s\n`);
    return;
  }

  if (mode !== 'fetch' && mode !== 'update') {
    analyzePatterns(rounds, stats);
  }

  if (mode === 'pick' || mode === 'all') {
    pick(rounds, stats, pickCount);
  }
}

main().catch(console.error);
