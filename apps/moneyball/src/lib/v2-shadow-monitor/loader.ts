import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseCohortMarkdown, type CohortDoc } from "./parse";

const APP_COHORT_DIR = join(process.cwd(), "data", "op-analysis-cohort");

const ROOT_COHORT_DIR = join(
  process.cwd(),
  "..",
  "..",
  "apps",
  "moneyball",
  "data",
  "op-analysis-cohort",
);

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
  const match = file.match(/^(\d{4}-\d{2}-\d{2})-cohort(?:-cycle-(\d+))?\.md$/);
  if (!match) return { date: file, cycle: 0 };
  return { date: match[1], cycle: match[2] ? Number(match[2]) : 0 };
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
    .filter((f) => f.endsWith(".md"))
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
