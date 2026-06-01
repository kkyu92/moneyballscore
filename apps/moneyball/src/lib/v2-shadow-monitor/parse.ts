// op-analysis-cohort md 파서 — h1 / paragraph / h2 / table 만 처리.
// cycle 1103 explore-idea heavy (cycle 1102 spec 후보 E v2-shadow-monitor dashboard ship).

export interface CohortTable {
  heading: string;
  columns: string[];
  rows: string[][];
}

export interface CohortDoc {
  title: string;
  summary: string;
  tables: CohortTable[];
  footer: string | null;
}

const HR_REGEX = /^---+\s*$/;
const TABLE_SEP_REGEX = /^\|?[\s:|-]+$/;

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

export function parseCohortMarkdown(body: string): CohortDoc {
  const lines = body.split("\n");
  let title = "";
  let summary = "";
  let footer: string | null = null;
  const tables: CohortTable[] = [];

  let i = 0;

  while (i < lines.length && !lines[i].startsWith("# ")) i += 1;
  if (i < lines.length) {
    title = lines[i].slice(2).trim();
    i += 1;
  }

  while (i < lines.length && lines[i].trim() === "") i += 1;
  if (i < lines.length && !lines[i].startsWith("##") && !HR_REGEX.test(lines[i])) {
    summary = lines[i].trim();
    i += 1;
  }

  let pendingHeading: string | null = null;

  for (; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      pendingHeading = line.slice(3).trim();
      continue;
    }
    if (HR_REGEX.test(line)) {
      // footer = hr 이후 nonempty 라인 모두 join
      const rest: string[] = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const t = lines[j].trim();
        if (t === "") continue;
        rest.push(t);
      }
      if (rest.length > 0) footer = rest.join(" ");
      break;
    }
    if (line.startsWith("|") && pendingHeading) {
      const columns = splitRow(line);
      i += 1;
      if (i >= lines.length || !TABLE_SEP_REGEX.test(lines[i])) {
        // 잘못된 table — heading reset 만
        pendingHeading = null;
        continue;
      }
      i += 1;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      i -= 1;
      tables.push({ heading: pendingHeading, columns, rows });
      pendingHeading = null;
    }
  }

  return { title, summary, tables, footer };
}
