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

export interface CohortFile {
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

export function listCohortFiles(): string[] {
  const dir = resolveCohortDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
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
