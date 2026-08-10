import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');
const ROOT_PACKAGE_JSON = join(REPO_ROOT, 'package.json');
const MONEYBALL_PACKAGE_JSON = join(REPO_ROOT, 'apps/moneyball/package.json');
const VERSION_FILE = join(REPO_ROOT, 'VERSION');
const CHANGELOG_FILE = join(REPO_ROOT, 'CHANGELOG.md');

function readVersion(path: string): string {
  return JSON.parse(readFileSync(path, 'utf8')).version;
}

describe('version-sync-guard (cycle 2047) — VERSION/package.json/CHANGELOG 3-way drift 재발 차단', () => {
  it('루트 package.json 과 apps/moneyball/package.json 버전 일치', () => {
    expect(readVersion(ROOT_PACKAGE_JSON)).toBe(readVersion(MONEYBALL_PACKAGE_JSON));
  });

  it('VERSION 파일이 apps/moneyball/package.json 버전과 일치', () => {
    const versionFile = readFileSync(VERSION_FILE, 'utf8').trim();
    expect(versionFile).toBe(readVersion(MONEYBALL_PACKAGE_JSON));
  });

  it('CHANGELOG.md 최상단 항목 버전이 apps/moneyball/package.json 버전과 일치', () => {
    const changelog = readFileSync(CHANGELOG_FILE, 'utf8');
    const firstHeading = changelog.match(/^## v([\d.]+)/m);
    expect(firstHeading).not.toBeNull();
    expect(firstHeading?.[1]).toBe(readVersion(MONEYBALL_PACKAGE_JSON));
  });
});
