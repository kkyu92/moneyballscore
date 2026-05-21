import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export interface ChangelogEntry {
  id: string;
  title: string;
  date: string | null;
  cycle: number | null;
  body: string;
}

const FALLBACK_ENTRIES: ChangelogEntry[] = [
  {
    id: 'fallback-1',
    title: 'CHANGELOG 일시 표시 불가',
    date: null,
    cycle: null,
    body: '소스 파일을 일시적으로 불러올 수 없습니다. GitHub 저장소의 [CHANGELOG.md](https://github.com/kkyu92/moneyballscore/blob/main/CHANGELOG.md) 에서 최신 변경 이력을 확인할 수 있습니다.',
  },
];

const CANDIDATE_PATHS = [
  // monorepo root cwd (turbo / pnpm root)
  () => path.join(process.cwd(), 'CHANGELOG.md'),
  // apps/moneyball cwd (next dev/build from app)
  () => path.join(process.cwd(), '../../CHANGELOG.md'),
  // Vercel build path
  () => '/vercel/path0/CHANGELOG.md',
];

function readChangelogFile(): string | null {
  for (const resolver of CANDIDATE_PATHS) {
    try {
      const p = resolver();
      if (existsSync(p)) {
        return readFileSync(p, 'utf-8');
      }
    } catch {
      // try next
    }
  }
  return null;
}

const DATE_REGEX = /(\d{4})-(\d{2})-(\d{2})/;
const CYCLE_REGEX = /cycle\s*(\d+)/i;

function slugify(title: string, idx: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return `${idx}-${base || 'entry'}`;
}

export function parseChangelog(): ChangelogEntry[] {
  const raw = readChangelogFile();
  if (!raw) return FALLBACK_ENTRIES;

  // Split on h2 boundaries. Keep separator for accurate slicing.
  const lines = raw.split('\n');
  const entries: ChangelogEntry[] = [];
  let currentTitle: string | null = null;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentTitle === null) return;
    const body = currentBuffer.join('\n').trim();
    const dateMatch = currentTitle.match(DATE_REGEX);
    const cycleMatch = currentTitle.match(CYCLE_REGEX);
    entries.push({
      id: slugify(currentTitle, entries.length),
      title: currentTitle,
      date: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null,
      cycle: cycleMatch ? parseInt(cycleMatch[1], 10) : null,
      body,
    });
  };

  for (const line of lines) {
    if (line.startsWith('# ')) {
      // top-level title, skip
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      currentTitle = line.slice(3).trim();
      currentBuffer = [];
    } else if (currentTitle !== null) {
      currentBuffer.push(line);
    }
  }
  flush();

  return entries.length > 0 ? entries : FALLBACK_ENTRIES;
}
