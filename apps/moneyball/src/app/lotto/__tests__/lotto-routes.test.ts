import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import robots from "@/app/robots";
import {
  generateMetadata as archiveGenerateMetadata,
} from "@/app/lotto/archive/[date]/page";
import { metadata as notFoundMetadata } from "@/app/lotto/archive/[date]/not-found";
import { metadata as archiveIndexMetadata } from "@/app/lotto/archive/page";
import {
  metadata as methodologyMetadata,
} from "@/app/lotto/methodology/page";
import sitemap from "@/app/sitemap";
import { listArchiveDates } from "@/lib/lotto/archive";

const REPO_ROOT = process.cwd();
const METHODOLOGY_SRC = join(
  REPO_ROOT,
  "src/app/lotto/methodology/page.tsx",
);
const ARCHIVE_SRC = join(
  REPO_ROOT,
  "src/app/lotto/archive/[date]/page.tsx",
);
const SITEMAP_SRC = join(REPO_ROOT, "src/app/sitemap.ts");
const HEADER_SRC = join(REPO_ROOT, "src/components/layout/Header.tsx");
const FOOTER_SRC = join(REPO_ROOT, "src/components/layout/Footer.tsx");

describe("/lotto/methodology metadata + module load", () => {
  it("metadata title + canonical 박제", () => {
    expect(methodologyMetadata.title).toBe("Lotto 통계 방법론");
    expect(methodologyMetadata.alternates?.canonical).toBe(
      "https://moneyballscore.vercel.app/lotto/methodology",
    );
  });

  it("OG type article + Twitter summary_large_image", () => {
    const og = methodologyMetadata.openGraph as { type?: string } | undefined;
    const tw = methodologyMetadata.twitter as { card?: string } | undefined;
    expect(og?.type).toBe("article");
    expect(tw?.card).toBe("summary_large_image");
  });
});

describe("/lotto/archive/[date] indexable metadata (plan #6 Step A regression)", () => {
  it("metadata.robots.index === true + follow === true (Alt 3 변형)", async () => {
    const meta = await archiveGenerateMetadata({
      params: Promise.resolve({ date: "2026-05-16" }),
    });
    const robotsMeta = meta.robots;
    expect(robotsMeta).toBeTruthy();
    if (typeof robotsMeta === "object" && robotsMeta !== null) {
      expect(robotsMeta.index).toBe(true);
      expect(robotsMeta.follow).toBe(true);
    } else {
      throw new Error("robots metadata expected object");
    }
  });

  it("googleBot index/follow true (검색 색인 활성)", async () => {
    const meta = await archiveGenerateMetadata({
      params: Promise.resolve({ date: "2026-05-16" }),
    });
    const robotsMeta = meta.robots;
    if (
      typeof robotsMeta === "object" &&
      robotsMeta !== null &&
      typeof robotsMeta.googleBot === "object" &&
      robotsMeta.googleBot !== null
    ) {
      expect(robotsMeta.googleBot.index).toBe(true);
      expect(robotsMeta.googleBot.follow).toBe(true);
    } else {
      throw new Error("googleBot metadata expected object");
    }
  });

  it("alternates.canonical 박제 (date 별 unique URL)", async () => {
    const meta = await archiveGenerateMetadata({
      params: Promise.resolve({ date: "2026-05-16" }),
    });
    expect(meta.alternates?.canonical).toBe(
      "https://moneyballscore.vercel.app/lotto/archive/2026-05-16",
    );
  });
});

describe("/lotto/archive/[date]/not-found.tsx — noindex metadata (cycle 799 v13-A 정합)", () => {
  it("metadata.robots.index === false + follow === false", () => {
    const robotsMeta = notFoundMetadata.robots;
    expect(robotsMeta).toBeTruthy();
    if (typeof robotsMeta === "object" && robotsMeta !== null) {
      expect(robotsMeta.index).toBe(false);
      expect(robotsMeta.follow).toBe(false);
    } else {
      throw new Error("not-found robots metadata expected object");
    }
  });
});

interface RobotsRule {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
}

describe("robots.ts — Alt 3 변형 (plan #6 Step A)", () => {
  const r = robots();
  const rules = (Array.isArray(r.rules) ? r.rules : [r.rules]) as RobotsRule[];

  const findRule = (ua: string): RobotsRule | undefined =>
    rules.find((x) =>
      Array.isArray(x.userAgent) ? x.userAgent.includes(ua) : x.userAgent === ua,
    );

  it("User-agent * — /lotto/archive disallow 부재 (검색 색인 활성)", () => {
    const rule = findRule("*");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).not.toContain("/lotto/archive");
    expect(dis).not.toContain("/lotto");
  });

  it("Googlebot — /lotto/archive disallow 부재 (검색 색인 활성)", () => {
    const rule = findRule("Googlebot");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).not.toContain("/lotto/archive");
    expect(dis).not.toContain("/lotto");
  });

  it("Mediapartners-Google — /lotto + /lotto/archive 양쪽 sub-tree disallow 명시 (AdSense 차단)", () => {
    const rule = findRule("Mediapartners-Google");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).toContain("/lotto");
    expect(dis).toContain("/lotto/archive");
  });

  it("AdsBot-Google — /lotto + /lotto/archive 양쪽 sub-tree disallow 명시 (AdSense 차단)", () => {
    const rule = findRule("AdsBot-Google");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).toContain("/lotto");
    expect(dis).toContain("/lotto/archive");
  });
});

describe("sitemap.ts — /lotto/archive 동적 URL 포함 + /lotto/methodology static entry", () => {
  const src = readFileSync(SITEMAP_SRC, "utf-8");

  it("/lotto/methodology entry 박제", () => {
    expect(src).toMatch(/\/lotto\/methodology/);
  });

  it("lottoArchiveRoutes 동적 URL 박제 (listArchiveDates source)", () => {
    expect(src).toMatch(/lottoArchiveRoutes/);
    expect(src).toMatch(/listArchiveDates/);
  });

  it("lottoArchiveRoutes priority 0.6 + lastModified T20:45+09:00 정합", () => {
    expect(src).toMatch(/priority:\s*0\.6/);
    expect(src).toMatch(/T20:45:00\+09:00/);
  });

  it("sitemap() 호출 시 lottoArchiveRoutes entry 생성 (실제 박제된 date 있을 때)", async () => {
    const entries = await sitemap();
    const archiveDates = listArchiveDates();
    if (archiveDates.length > 0) {
      const archiveEntries = entries.filter((e) =>
        e.url.startsWith("https://moneyballscore.vercel.app/lotto/archive/"),
      );
      expect(archiveEntries.length).toBe(archiveDates.length);
      const firstDate = archiveDates[0];
      const sampleEntry = archiveEntries.find((e) =>
        e.url.endsWith(`/lotto/archive/${firstDate}`),
      );
      expect(sampleEntry).toBeTruthy();
      expect(sampleEntry?.priority).toBe(0.6);
      expect(sampleEntry?.changeFrequency).toBe("weekly");
    }
  });
});

describe("/lotto/archive/[date] — Breadcrumb 박제 (info-arch regression guard)", () => {
  const src = readFileSync(ARCHIVE_SRC, "utf-8");

  it("Breadcrumb import 박제", () => {
    expect(src).toMatch(/import\s*\{\s*Breadcrumb\s*\}\s*from\s*"@\/components\/shared\/Breadcrumb"/);
  });

  it("<Breadcrumb> render + /lotto hub href + /lotto/archive href (plan #7 Step C 이후 구조)", () => {
    expect(src).toMatch(/<Breadcrumb/);
    expect(src).toMatch(/href:\s*"\/lotto"/);
    expect(src).toMatch(/href:\s*"\/lotto\/archive"/);
  });
});

describe("/lotto/archive index page metadata (plan #6 Step B)", () => {
  it("metadata.robots.index === true + follow === true", () => {
    const robotsMeta = archiveIndexMetadata.robots;
    expect(robotsMeta).toBeTruthy();
    if (typeof robotsMeta === "object" && robotsMeta !== null) {
      expect(robotsMeta.index).toBe(true);
      expect(robotsMeta.follow).toBe(true);
    } else {
      throw new Error("archive index robots metadata expected object");
    }
  });

  it("canonical = SITE_URL/lotto/archive", () => {
    expect(archiveIndexMetadata.alternates?.canonical).toBe(
      "https://moneyballscore.vercel.app/lotto/archive",
    );
  });

  it("title + description 박제", () => {
    expect(archiveIndexMetadata.title).toBe("로또 통계 아카이브");
    expect(archiveIndexMetadata.description).toMatch(/통계 분석/);
  });
});

describe("Header NAV — 로또 group 박제 (plan #6 Step B)", () => {
  const src = readFileSync(HEADER_SRC, "utf-8");

  it("로또 group label 박제", () => {
    expect(src).toMatch(/label:\s*"로또"/);
  });

  it("/lotto/methodology link 박제 in NAV", () => {
    expect(src).toMatch(/href:\s*"\/lotto\/methodology"/);
  });

  it("/lotto/archive link 박제 in NAV", () => {
    expect(src).toMatch(/href:\s*"\/lotto\/archive"/);
  });
});

describe("Footer SITEMAP — 로또 column 박제 (plan #6 Step B)", () => {
  const src = readFileSync(FOOTER_SRC, "utf-8");

  it("로또 column title 박제", () => {
    expect(src).toMatch(/title:\s*"로또"/);
  });

  it("/lotto/methodology + /lotto/archive link 양쪽 박제 in Footer", () => {
    expect(src).toMatch(/href:\s*"\/lotto\/methodology"/);
    expect(src).toMatch(/href:\s*"\/lotto\/archive"/);
  });

  it("도움말 column 안 /lotto/methodology entry 부재 (로또 column 으로 이동)", () => {
    const helpColumnMatch = src.match(
      /title:\s*"도움말",\s*links:\s*\[([\s\S]*?)\]/,
    );
    expect(helpColumnMatch).toBeTruthy();
    if (helpColumnMatch) {
      expect(helpColumnMatch[1]).not.toMatch(/\/lotto\/methodology/);
    }
  });
});

describe("sitemap.ts — /lotto/archive static index entry 박제 (plan #6 Step B)", () => {
  const src = readFileSync(SITEMAP_SRC, "utf-8");

  it("/lotto/archive static entry 박제 (priority 0.6 weekly)", () => {
    expect(src).toMatch(
      /url:\s*`\$\{baseUrl\}\/lotto\/archive`[^}]*priority:\s*0\.6/,
    );
  });

  it("sitemap() 호출 시 /lotto/archive static entry 생성", async () => {
    const entries = await sitemap();
    const archiveIndexEntry = entries.find(
      (e) => e.url === "https://moneyballscore.vercel.app/lotto/archive",
    );
    expect(archiveIndexEntry).toBeTruthy();
    expect(archiveIndexEntry?.priority).toBe(0.6);
    expect(archiveIndexEntry?.changeFrequency).toBe("weekly");
  });
});

describe("/lotto/methodology — AdSense surface signal grep (정체성 보존)", () => {
  const src = readFileSync(METHODOLOGY_SRC, "utf-8");
  const visibleText = src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.includes("당첨/베팅"))
    .join("\n");

  const forbiddenLiteral = ["당첨 번호", "베팅 추천", "조합 추천", "예상번호"];

  for (const term of forbiddenLiteral) {
    it(`"${term}" 표면 신호 0건`, () => {
      expect(visibleText).not.toContain(term);
    });
  }
});

describe("plan #7 Step E — lotto-pick-update cron workflow regression", () => {
  const UPDATE_YAML = join(REPO_ROOT, "../../.github/workflows/lotto-pick-update.yml");
  const MONITOR_YAML = join(REPO_ROOT, "../../.github/workflows/lotto-pick-monitor.yml");

  it("update workflow cron = '19 0,3,6 * * 5' (multi-fire 3회)", () => {
    const yaml = readFileSync(UPDATE_YAML, "utf-8");
    expect(yaml).toContain("'19 0,3,6 * * 5'");
  });

  it("update workflow idempotent skip 가드 박제", () => {
    const yaml = readFileSync(UPDATE_YAML, "utf-8");
    expect(yaml).toMatch(/Idempotent skip if already exists/);
    expect(yaml).toContain("apps/moneyball/data/lotto-picks/");
  });

  it("update workflow pick-md mode 호출", () => {
    const yaml = readFileSync(UPDATE_YAML, "utf-8");
    expect(yaml).toContain("scripts/lotto.ts pick-md");
  });

  it("update workflow PR auto-merge 박제 (R7 정합)", () => {
    const yaml = readFileSync(UPDATE_YAML, "utf-8");
    expect(yaml).toContain("--squash --auto --delete-branch");
  });

  it("monitor workflow cron = '0 17 * * 5' (KST 토 02:00)", () => {
    const yaml = readFileSync(MONITOR_YAML, "utf-8");
    expect(yaml).toContain("'0 17 * * 5'");
  });

  it("monitor workflow ::error:: 명시 박제 (silent skip 차단)", () => {
    const yaml = readFileSync(MONITOR_YAML, "utf-8");
    expect(yaml).toContain("::error::");
  });
});

describe("plan #7 Step E — scripts/lotto.ts pick-md mode + markdown renderer", () => {
  it("scripts/lotto.ts 안 'pick-md' mode dispatch 박제", () => {
    const src = readFileSync(join(REPO_ROOT, "../../scripts/lotto.ts"), "utf-8");
    expect(src).toMatch(/mode === ['"]pick-md['"]/);
    expect(src).toMatch(/function pickMd\(/);
    expect(src).toMatch(/function renderPickMarkdown\(/);
    expect(src).toMatch(/function buildCandidates\(/);
    expect(src).toMatch(/function nextSaturdayKST\(/);
  });

  it("markdown 출력 = 50조합 table + 추첨 후 비교 + 주의 섹션", () => {
    const src = readFileSync(join(REPO_ROOT, "../../scripts/lotto.ts"), "utf-8");
    const renderFn = src.match(/export function renderPickMarkdown[\s\S]*?return head;/)?.[0] ?? "";
    expect(renderFn).toContain("## 50세트 전체");
    expect(renderFn).toContain("## 추첨 후 비교 검증");
    expect(renderFn).toContain("## 주의");
    expect(renderFn).toContain("규칙 필터 통과 + 역대 당첨 제외");
  });

  it("markdown 안 AdSense 표면 신호 0건 (당첨/베팅/예상번호/베팅추천)", () => {
    const src = readFileSync(join(REPO_ROOT, "../../scripts/lotto.ts"), "utf-8");
    const renderFn = src.match(/export function renderPickMarkdown[\s\S]*?return head;/)?.[0] ?? "";
    expect(renderFn).not.toMatch(/당첨\s*번호/);
    expect(renderFn).not.toMatch(/베팅\s*추천/);
    expect(renderFn).not.toMatch(/예상\s*번호/);
    expect(renderFn).not.toContain("조합 추천");
  });
});

const LOTTO_HUB_SRC = join(REPO_ROOT, "src/app/lotto/page.tsx");

describe("plan #7 Step F — /lotto hub AdSense surface signal grep (정체성 보존)", () => {
  const src = readFileSync(LOTTO_HUB_SRC, "utf-8");
  const visibleText = src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.includes("당첨/베팅"))
    .join("\n");

  const forbiddenLiteral = ["당첨 번호", "베팅 추천", "조합 추천", "예상번호"];

  for (const term of forbiddenLiteral) {
    it(`hub page "${term}" 표면 신호 0건`, () => {
      expect(visibleText).not.toContain(term);
    });
  }
});

describe("plan #7 Step F — /lotto hub 산문 콘텐츠 박제 (AdSense content quality)", () => {
  const src = readFileSync(LOTTO_HUB_SRC, "utf-8");

  it("조합 선별 방식 section 박제", () => {
    expect(src).toMatch(/조합 선별 방식/);
  });

  it("합계·홀짝·연속쌍 3지표 설명 박제", () => {
    expect(src).toMatch(/합계/);
    expect(src).toMatch(/홀짝/);
    expect(src).toMatch(/연속쌍/);
  });

  it("robots: index + follow true", () => {
    expect(src).toContain("index: true");
    expect(src).toContain("follow: true");
  });
});
