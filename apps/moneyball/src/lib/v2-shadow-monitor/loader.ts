import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseCohortMarkdown, type CohortDoc } from "./parse";

// op-analysis-weekly cron (plan #8 Tier 1 M7) 가 실제 박제하는 디렉토리.
// 과거 "op-analysis-cohort" 디렉토리는 수동 heavy-mode 실행 전용이었고 cycle 1340 이후
// 미사용 — cron 은 처음부터(cycle 887, commit 9351616c) 이 디렉토리에 박제해왔다.
const APP_COHORT_DIR = join(process.cwd(), "data", "op-analysis");

const ROOT_COHORT_DIR = join(
  process.cwd(),
  "..",
  "..",
  "apps",
  "moneyball",
  "data",
  "op-analysis",
);

export const COHORT_FILENAME_REGEX = /^(\d{4}-\d{2}-\d{2})-cohort(-split)?(?:-cycle-(\d+))?\.md$/;

interface CohortFile {
  file: string;
  doc: CohortDoc;
}

function resolveCohortDir(): string {
  try {
    readdirSync(APP_COHORT_DIR);
    return APP_COHORT_DIR;
  } catch {
    return ROOT_COHORT_DIR;
  }
}

function parseCohortFilename(file: string): { date: string; cycle: number } {
  const match = file.match(COHORT_FILENAME_REGEX);
  if (!match) return { date: file, cycle: 0 };
  return { date: match[1], cycle: match[3] ? Number(match[3]) : 0 };
}

export function compareCohortFilenames(a: string, b: string): number {
  const pa = parseCohortFilename(a);
  const pb = parseCohortFilename(b);
  if (pa.date !== pb.date) return pa.date < pb.date ? -1 : 1;
  return pa.cycle - pb.cycle;
}

function listCohortFiles(): string[] {
  const dir = resolveCohortDir();
  return readdirSync(dir)
    .filter((f) => COHORT_FILENAME_REGEX.test(f))
    .sort(compareCohortFilenames)
    .reverse();
}

export function loadLatestCohort(): CohortFile | null {
  const files = listCohortFiles();
  if (files.length === 0) return null;
  const dir = resolveCohortDir();
  const file = files[0];
  const body = readFileSync(join(dir, file), "utf8");
  return { file, doc: parseCohortMarkdown(body) };
}
