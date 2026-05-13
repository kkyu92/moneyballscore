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

function sumNums(n: number[])       { return n.reduce((a,b)=>a+b,0); }
function oddCount(n: number[])      { return n.filter(x=>x%2===1).length; }
function consecPairs(n: number[])   { let c=0; for(let i=0;i<5;i++) if(n[i+1]-n[i]===1)c++; return c; }
function numRange(n: number[])      { return n[5]-n[0]; }
function zoneCount(n: number[], lo: number, hi: number) { return n.filter(x=>x>=lo&&x<=hi).length; }
function maxGap(n: number[])        { return Math.max(...n.slice(1).map((v,i)=>v-n[i])); }
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
  { name: '합계',              get: (n)=>sumNums(n),      lo:s=>s.sumMin,      hi:s=>s.sumMax },
  { name: '스팬',              get: (n)=>numRange(n),     lo:s=>s.rangeMin,    hi:s=>s.rangeMax },
  { name: '연속쌍',            get: (n)=>consecPairs(n),  lo:()=>null,         hi:s=>s.consecMax },
  { name: '최대인접간격',      get: (n)=>maxGap(n),       lo:s=>s.maxGapMin,   hi:()=>null },
  { name: '최솟값(pos1)',      get: (n)=>n[0],            lo:s=>s.posMin[0],   hi:s=>s.posMax[0] },
  { name: '2번째(pos2)',       get: (n)=>n[1],            lo:s=>s.posMin[1],   hi:s=>s.posMax[1] },
  { name: '3번째(pos3)',       get: (n)=>n[2],            lo:s=>s.posMin[2],   hi:s=>s.posMax[2] },
  { name: '4번째(pos4)',       get: (n)=>n[3],            lo:s=>s.posMin[3],   hi:s=>s.posMax[3] },
  { name: '5번째(pos5)',       get: (n)=>n[4],            lo:s=>s.posMin[4],   hi:s=>s.posMax[4] },
  { name: '최댓값(pos6)',      get: (n)=>n[5],            lo:s=>s.posMin[5],   hi:s=>s.posMax[5] },
  { name: '간격[1-2]',         get: (n)=>n[1]-n[0],       lo:()=>null,         hi:s=>s.gapMax[0] },
  { name: '간격[2-3]',         get: (n)=>n[2]-n[1],       lo:()=>null,         hi:s=>s.gapMax[1] },
  { name: '간격[3-4]',         get: (n)=>n[3]-n[2],       lo:()=>null,         hi:s=>s.gapMax[2] },
  { name: '간격[4-5]',         get: (n)=>n[4]-n[3],       lo:()=>null,         hi:s=>s.gapMax[3] },
  { name: '간격[5-6]',         get: (n)=>n[5]-n[4],       lo:()=>null,         hi:s=>s.gapMax[4] },
  { name: '최솟+최댓값 합',    get: (n)=>n[0]+n[5],       lo:s=>s.minMaxSumMin, hi:s=>s.minMaxSumMax },
  { name: '중간값 합(pos3+4)', get: (n)=>n[2]+n[3],       lo:s=>s.midSumMin,   hi:s=>s.midSumMax },
  { name: '5의배수 개수',      get: (n)=>n.filter(x=>x%5===0).length,        lo:()=>null, hi:s=>s.multOf5Max },
  { name: '완전제곱수 개수',   get: (n)=>n.filter(x=>PERF_SQ.has(x)).length, lo:()=>null, hi:s=>s.perfSqMax },
  { name: '소수 개수',         get: (n)=>n.filter(x=>PRIMES.has(x)).length,   lo:()=>null, hi:s=>s.primesMax },
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

  if (mode !== 'fetch' && mode !== 'update') {
    analyzePatterns(rounds, stats);
  }

  if (mode === 'pick' || mode === 'all') {
    pick(rounds, stats, pickCount);
  }
}

main().catch(console.error);
