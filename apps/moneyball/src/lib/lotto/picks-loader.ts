import fs from "node:fs";
import path from "node:path";

const PICKS_DIR_ROOT = path.join(process.cwd(), "apps/moneyball/data/lotto-picks");
const PICKS_DIR_FALLBACK = path.join(process.cwd(), "data/lotto-picks");

function getPicksDir(): string {
  if (fs.existsSync(PICKS_DIR_ROOT)) return PICKS_DIR_ROOT;
  return PICKS_DIR_FALLBACK;
}

const SATURDAY_RE = /^20[2-9]\d-\d{2}-\d{2}$/;

function isSaturdayFile(name: string): boolean {
  const base = name.replace(/\.md$/, "");
  if (!SATURDAY_RE.test(base)) return false;
  if (base.includes("-mix") || base.includes("-balanced") || base.includes("-moderate")) return false;
  const d = new Date(base + "T00:00:00Z");
  return d.getUTCDay() === 6;
}

export interface LottoSet {
  idx: number;
  numbers: number[];
  sum: number;
  oddEven: string;
  consecutive: number;
  avoidScore: number;
}

export interface LottoPicks {
  date: string;
  drawNo: number | null;
  generatedAt: string | null;
  sets: LottoSet[];
}

function parseTable(raw: string): LottoSet[] {
  const sets: LottoSet[] = [];
  const lines = raw.split("\n");
  let inTable = false;
  for (const line of lines) {
    if (line.startsWith("| #")) { inTable = true; continue; }
    if (line.startsWith("|---")) continue;
    if (!inTable) continue;
    if (!line.startsWith("|")) { inTable = false; continue; }
    const cols = line.split("|").map(s => s.trim()).filter(Boolean);
    if (cols.length < 6) continue;
    const idx = parseInt(cols[0], 10);
    if (isNaN(idx)) continue;
    const numbers = cols[1].split(/\s+/).map(Number).filter(n => n >= 1 && n <= 45);
    if (numbers.length !== 6) continue;
    const sum = parseInt(cols[2], 10) || 0;
    const oddEven = cols[3] ?? "";
    const consecutive = parseInt(cols[4], 10) || 0;
    const avoidScore = parseFloat(cols[5]) || 0;
    sets.push({ idx, numbers, sum, oddEven, consecutive, avoidScore });
  }
  return sets;
}

export function parseLottoPicksMd(raw: string): Omit<LottoPicks, "date"> {
  const drawNoMatch = raw.match(/\((\d{4})회\)/);
  const drawNo = drawNoMatch ? parseInt(drawNoMatch[1], 10) : null;
  const genMatch = raw.match(/\*\*생성 시각\*\*:\s*(.+)/);
  const generatedAt = genMatch ? genMatch[1].trim() : null;
  const sets = parseTable(raw);
  return { drawNo, generatedAt, sets };
}

export function getLatestLottoPicks(): LottoPicks | null {
  const dir = getPicksDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(isSaturdayFile).sort().reverse();
  if (!files.length) return null;
  const date = files[0].replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(dir, files[0]), "utf-8");
  return { date, ...parseLottoPicksMd(raw) };
}

const RESULTS_DIR_ROOT = path.join(process.cwd(), "apps/moneyball/data/lotto-results");
const RESULTS_DIR_FALLBACK = path.join(process.cwd(), "data/lotto-results");

function getResultsDir(): string {
  if (fs.existsSync(RESULTS_DIR_ROOT)) return RESULTS_DIR_ROOT;
  return RESULTS_DIR_FALLBACK;
}

export interface LottoResult {
  date: string;
  drawNo: number | null;
  winning: number[];
  bonus: number | null;
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  tier5: number;
  rulePass: number;
  ruleFail: number;
  topHas1st: boolean;
  bodyMarkdown: string;
}

function parseResultMd(raw: string): Omit<LottoResult, "date"> | null {
  const jsonMatch = raw.match(/JSON:\s*(\{[^\n]+\})/);
  if (!jsonMatch) return null;
  try {
    const data = JSON.parse(jsonMatch[1]) as {
      draw: number;
      winning: number[];
      bonus: number;
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
      tier5: number;
      rule_pass: number;
      rule_fail: number;
      top10_has_1st: boolean;
    };
    return {
      drawNo: data.draw,
      winning: data.winning,
      bonus: data.bonus,
      tier1: data.tier1,
      tier2: data.tier2,
      tier3: data.tier3,
      tier4: data.tier4,
      tier5: data.tier5,
      rulePass: data.rule_pass,
      ruleFail: data.rule_fail,
      topHas1st: data.top10_has_1st,
      bodyMarkdown: raw,
    };
  } catch {
    return null;
  }
}

export function getLatestLottoResult(): LottoResult | null {
  const dir = getResultsDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^20\d{2}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse();
  if (!files.length) return null;
  const file = files[0];
  const date = file.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(dir, file), "utf-8");
  const parsed = parseResultMd(raw);
  if (!parsed) return null;
  return { date, ...parsed };
}

export type LottoBallColor = "yellow" | "blue" | "red" | "gray" | "green";

export function ballColor(n: number): LottoBallColor {
  if (n <= 10) return "yellow";
  if (n <= 20) return "blue";
  if (n <= 30) return "red";
  if (n <= 40) return "gray";
  return "green";
}
