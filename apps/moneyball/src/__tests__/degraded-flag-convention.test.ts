import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 3402 (review-code heavy) — structural guard requested by the cycle 3401 retro.
//
// Recurring bug class (found + fixed independently 3x: teams/buildTeamProfile.ts
// cycle 3396, mlb/buildMlbTeamProfile.ts cycle 3393, 5 more builders in teams/+matchup/
// cycle 3397, then a further ~20 files cycle 3402): a server-side "builder" under
// lib/**/*.ts fetches from Supabase, wraps the query in try/catch, and on error
// silently falls back to empty/default data WITHOUT setting any `degraded` boolean
// on the returned shape. Downstream pages then compute `dbDegraded` from
// `Promise.allSettled` rejections only — but the internal catch never lets the
// promise reject, so a real DB outage renders as "no data today" instead of
// "service degraded", silently misleading users.
//
// This test is a blunt, file-level heuristic (not full control-flow/AST analysis of
// "same function" scoping) — it flags any lib/ file that contains BOTH a `catch`
// block AND a Supabase `.from(` call site, unless the file also contains the literal
// string `degraded` somewhere (the established fix: thread a `degraded: boolean`
// into the return shape) or an explicit exemption comment:
//
//   // degraded-flag-exempt: <short reason>
//
// Use the exemption marker for genuinely clean cases — e.g. the catch is for an
// unrelated concern (JSON.parse, external API), the function already fails loud
// (no catch around the Supabase call), or there is no page consumer with a
// `dbDegraded`-style banner to thread the flag into. Do NOT weaken this test's
// matching logic to make a new violation disappear — fix the builder or add a
// reasoned exemption instead.

const LIB_DIR = join(__dirname, "..", "lib");
const EXEMPT_MARKER = "degraded-flag-exempt:";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      walk(full, out);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("degraded-flag convention (silent-drift structural guard, cycle 3402)", () => {
  it("every lib/ file with a Supabase-backed catch block exposes a `degraded` signal or an explicit exemption", () => {
    const offenders: string[] = [];

    for (const file of walk(LIB_DIR)) {
      const content = readFileSync(file, "utf-8");
      const hasCatch = /\bcatch\s*\(/.test(content);
      const hasSupabaseCall = /\.from\(/.test(content);
      if (!hasCatch || !hasSupabaseCall) continue;

      const hasDegradedSignal = content.includes("degraded");
      const hasExemption = content.includes(EXEMPT_MARKER);
      if (!hasDegradedSignal && !hasExemption) {
        offenders.push(file.replace(join(__dirname, "..", "..", "..") + "/", ""));
      }
    }

    expect(
      offenders,
      offenders.length > 0
        ? `Found ${offenders.length} file(s) with a catch+Supabase call but no "degraded" signal or ` +
            `"${EXEMPT_MARKER}" exemption comment. Add a \`degraded: boolean\` to the return shape ` +
            `(see lib/teams/buildTeamProfile.ts / lib/mlb/buildMlbTeamProfile.ts for the pattern), or ` +
            `add "// ${EXEMPT_MARKER} <reason>" if the catch is genuinely unrelated to DB degradation:\n` +
            offenders.map((f) => `  - ${f}`).join("\n")
        : undefined,
    ).toEqual([]);
  });
});
