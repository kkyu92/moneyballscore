import fs from "node:fs";
import path from "node:path";

const ARCHIVE_DIR = path.join(process.cwd(), "apps/moneyball/data/lotto-picks");
const ARCHIVE_DIR_FALLBACK = path.join(process.cwd(), "data/lotto-picks");
const DATE_REGEX = /^20[2-9]\d-\d{2}-\d{2}$/;

function getArchiveDir(): string {
  if (fs.existsSync(ARCHIVE_DIR)) return ARCHIVE_DIR;
  if (fs.existsSync(ARCHIVE_DIR_FALLBACK)) return ARCHIVE_DIR_FALLBACK;
  return ARCHIVE_DIR;
}

export function isValidArchiveDate(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() + 1 !== m ||
    utc.getUTCDate() !== d
  ) {
    return false;
  }
  return utc.getUTCDay() === 6;
}

export function listArchiveDates(): string[] {
  const dir = getArchiveDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter(isValidArchiveDate)
    .sort()
    .reverse();
}

export interface ArchiveContent {
  date: string;
  raw: string;
  title: string;
}

export function readArchive(date: string): ArchiveContent | null {
  if (!isValidArchiveDate(date)) return null;
  const dir = getArchiveDir();
  const filePath = path.join(dir, `${date}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : `${date} 추첨 50세트`;
  return { date, raw, title };
}
