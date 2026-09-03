import fs from "node:fs";
import path from "node:path";

/**
 * 사용자 6-num 입력 검증용 데이터 로더.
 * - allPicks: 모든 pick md (전 주차 + 재활용 차단 이후 신규) 안 6-num 세트 (key = "1,2,3,4,5,6" sorted)
 *   → 매주 신규 pick md 추가 시 build 시점 자동 반영 (Next.js ISR)
 * - allWinners: 역대 1등 조합 (lotto-data.json 소스)
 */

const PICKS_DIR_CANDIDATES = [
  path.join(process.cwd(), "apps/moneyball/data/lotto-picks"),
  path.join(process.cwd(), "data/lotto-picks"),
];

function getPicksDir(): string {
  for (const d of PICKS_DIR_CANDIDATES) {
    if (fs.existsSync(d)) return d;
  }
  throw new Error("lotto-picks directory not found");
}

const ROW_RE = /^\|\s*\d+\s*\|\s*([0-9]+(?:\s+[0-9]+){5})\s*\|/gm;

export function loadAllPicks(): { keys: string[]; picksByFile: Record<string, string[]>; totalSets: number } {
  const dir = getPicksDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const keySet = new Set<string>();
  const picksByFile: Record<string, string[]> = {};
  let total = 0;
  for (const f of files) {
    const md = fs.readFileSync(path.join(dir, f), "utf-8");
    const keys: string[] = [];
    ROW_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ROW_RE.exec(md)) !== null) {
      const nums = m[1].split(/\s+/).map(Number);
      if (nums.length === 6 && nums.every((n) => n >= 1 && n <= 45)) {
        const key = nums.slice().sort((a, b) => a - b).join(",");
        keySet.add(key);
        keys.push(key);
        total++;
      }
    }
    picksByFile[f.replace(/\.md$/, "")] = keys;
  }
  return { keys: Array.from(keySet), picksByFile, totalSets: total };
}

interface WinnerEntry {
  round: number;
  date: string;
  numbers: number[];
  bonus: number;
}

const WINNERS_PATH_CANDIDATES = [
  path.join(process.cwd(), "scripts/lotto-data.json"),
  path.join(process.cwd(), "../../scripts/lotto-data.json"),
];

function getWinnersPath(): string {
  for (const p of WINNERS_PATH_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("lotto winners history (scripts/lotto-data.json) not found");
}

export function loadAllWinners(): { keyToRound: Record<string, WinnerEntry> } {
  const data = JSON.parse(fs.readFileSync(getWinnersPath(), "utf-8")) as WinnerEntry[];
  const map: Record<string, WinnerEntry> = {};
  for (const r of data) {
    const key = r.numbers.slice().sort((a, b) => a - b).join(",");
    map[key] = r;
  }
  return { keyToRound: map };
}
