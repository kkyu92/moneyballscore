/**
 * stale-data snapshot writer — plan #9 Step 4 (X2 데이터 갱신 cron).
 *
 * 매주 supabase predictions 읽어 CLAUDE.md / TODOS.md "stale 라인" source-of-truth markdown 박제.
 * auto-commit risk 차단: CLAUDE.md / TODOS.md 직접 sed 갱신 X, 별도 snapshot 파일만 commit.
 *
 * 사용:
 *   pnpm tsx scripts/update-stale-data.ts <out-path>
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildStaleSnapshot,
  type PredRowMin,
} from "../packages/kbo-data/src/analytics/stale-data-snapshot";

async function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error("usage: pnpm tsx scripts/update-stale-data.ts <out-path>");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("predictions")
    .select("is_correct, scoring_rule, confidence, verified_at")
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as PredRowMin[];

  const snap = buildStaleSnapshot({ rows, generatedAt: new Date() });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, snap.markdown);
  console.log(`saved: ${outPath}`);
  console.log(
    `n=${snap.totalVerified} acc=${snap.overallAcc.toFixed(1)}% v1.8=${snap.v18Progress.n}/${snap.v18Progress.target}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
