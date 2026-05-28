/**
 * v1.8 cohort credit-fail 식별 + 분리 (plan #14 C1c).
 *
 * 목적: v1.8 production cohort 안 LLM credit-fail / window_too_late / invalid
 * fallback row 분리 박제 → 진짜 v1.8 baseline cohort 정합성 회복 (cycle 989 박제
 * n=27 vs cycle 994 n=94 method drift 원인 진단).
 *
 * 2 단계 분리:
 * - Step A (식별, dry-run default): predictions 안 scoring_rule='v1.8' AND
 *   reasoning grep credit-fail signal (debate_fallback_quant / agentsFailed=true)
 *   식별 → 후보 IDs 별도 log 파일 박제 (`docs/research/v1.8-credit-fail-candidates.json`)
 * - Step B (사용자 confirm 후 write, opt-in `--write` flag): 식별된 prediction id
 *   allowlist 로 UPDATE scoring_rule='v1.8-credit-fail'. grep WHERE X = false
 *   positive 차단.
 *
 * 사용:
 *   pnpm tsx scripts/cohort-cleanup.ts            # Step A 식별 (dry-run)
 *   pnpm tsx scripts/cohort-cleanup.ts --write    # Step B 실행 (사용자 confirm 후)
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL  (required)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 *
 * 박제 산출:
 *   docs/research/v1.8-credit-fail-candidates.json  — Step A 후보 ID + reason
 *   docs/research/v1.8-cohort-baseline.md           — canonical method + rollback SQL
 *
 * rollback SQL (별도 박제):
 *   UPDATE predictions SET scoring_rule='v1.8'
 *   WHERE scoring_rule='v1.8-credit-fail';
 *
 * 자가 의심:
 *   - cohort method drift (cycle 861 n=32 / cycle 989 n=27 / cycle 994 n=94)
 *     = 측정 방법 차이 (예: pre_game cohort vs all cohort vs verified cohort)
 *   - 본 cleanup 후 canonical method 박제 = pre_game + scoring_rule='v1.8' +
 *     is_correct IS NOT NULL (verified) — credit-fail 분리 후 n 측정
 */

import { createClient } from '@supabase/supabase-js';
import { CURRENT_SCORING_RULE } from '../packages/shared/src/index';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface PredRow {
  id: number;
  game_id: number;
  scoring_rule: string;
  model_version: string | null;
  reasoning: Record<string, unknown> | null;
  is_correct: boolean | null;
  created_at: string;
}

interface CandidateEntry {
  id: number;
  game_id: number;
  created_at: string;
  model_version: string | null;
  signals: string[];
}

function detectCreditFailSignals(row: PredRow): string[] {
  const signals: string[] = [];
  const r = row.reasoning;
  if (!r || typeof r !== 'object') return signals;

  // signal 1: debate fallback_quant — reasoning.debate.agentsFailed=true 또는
  //           reasoning.fallback 라벨 또는 model_version=*-postview/-live (quant only).
  const debateObj = (r as Record<string, unknown>).debate as
    | Record<string, unknown>
    | undefined;
  if (debateObj?.agentsFailed === true) signals.push('debate_agents_failed');
  if (debateObj?.agentError != null) signals.push('debate_agent_error');

  // signal 2: model_version quant fallback (v1.8 production 인데 LLM 강등)
  const mv = row.model_version ?? '';
  if (mv.endsWith('-postview')) signals.push('mv_postview_quant');
  if (mv.endsWith('-live')) signals.push('mv_live_quant');

  // signal 3: reasoning.reason = 'debate_fallback_quant' 또는 유사 라벨
  if ((r as Record<string, unknown>).reason === 'debate_fallback_quant')
    signals.push('reasoning_debate_fallback');

  return signals;
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요');
    process.exit(1);
  }

  const db = createClient(supabaseUrl, serviceKey);

  console.log(`Mode: ${write ? 'WRITE (Step B UPDATE)' : 'DRY-RUN (Step A 식별만)'}`);
  console.log(`Target cohort: scoring_rule = ${CURRENT_SCORING_RULE}\n`);

  // 1. v1.8 row 전수 fetch (pre_game)
  console.log('[1/3] v1.8 production row fetch...');
  const PAGE = 1000;
  let offset = 0;
  const allRows: PredRow[] = [];
  while (true) {
    const result = await db
      .from('predictions')
      .select('id, game_id, scoring_rule, model_version, reasoning, is_correct, created_at')
      .eq('scoring_rule', CURRENT_SCORING_RULE)
      .eq('prediction_type', 'pre_game')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (result.error) {
      console.error('predictions select 실패:', result.error);
      process.exit(1);
    }
    const chunk = (result.data ?? []) as PredRow[];
    allRows.push(...chunk);
    if (chunk.length < PAGE) break;
    offset += PAGE;
    if (offset > 100000) {
      console.error('safety stop — offset > 100000');
      break;
    }
  }
  console.log(`v1.8 row: ${allRows.length}\n`);

  // 2. credit-fail 식별
  console.log('[2/3] credit-fail signal grep...');
  const candidates: CandidateEntry[] = [];
  const signalCounts = new Map<string, number>();
  for (const row of allRows) {
    const signals = detectCreditFailSignals(row);
    if (signals.length === 0) continue;
    candidates.push({
      id: row.id,
      game_id: row.game_id,
      created_at: row.created_at,
      model_version: row.model_version,
      signals,
    });
    for (const s of signals) {
      signalCounts.set(s, (signalCounts.get(s) ?? 0) + 1);
    }
  }

  console.log(`candidate row: ${candidates.length}`);
  console.log('signal 분포:');
  for (const [s, c] of signalCounts.entries()) {
    console.log(`  ${s}: ${c}`);
  }
  console.log('');

  // 3. dry-run = JSON 박제, write = UPDATE 실행
  const docsDir = path.join(process.cwd(), 'docs/research');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const candidatesPath = path.join(docsDir, 'v1.8-credit-fail-candidates.json');

  fs.writeFileSync(
    candidatesPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        cohort_total: allRows.length,
        candidate_count: candidates.length,
        signal_counts: Object.fromEntries(signalCounts.entries()),
        candidates,
      },
      null,
      2,
    ),
  );
  console.log(`후보 박제: ${candidatesPath}`);

  if (!write) {
    console.log('\n[3/3] DRY-RUN 완료. Step B 실행: --write 추가');
    console.log('박제 결과 review 후 사용자 confirm 받기.');
    return;
  }

  if (candidates.length === 0) {
    console.log('\n[3/3] candidate 0 — UPDATE skip');
    return;
  }

  console.log(`\n[3/3] Step B UPDATE 실행 — ${candidates.length} row...`);
  console.log("⚠️ ALL_SCORING_RULES tuple 안 'v1.8-credit-fail' 추가 선행 필요.");
  console.log('   tuple bump 없이 UPDATE 시 ScoringRule literal 안 → TypeScript 별도 build 영향.');

  // batch update (in chunks of 100)
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const BATCH = 100;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const ids = batch.map((c) => c.id);
    const updateResult = await db
      .from('predictions')
      .update({ scoring_rule: 'v1.8-credit-fail' })
      .in('id', ids);
    if (updateResult.error) {
      failed += batch.length;
      errors.push(updateResult.error.message);
    } else {
      updated += batch.length;
    }
    console.log(`  진행: ${Math.min(i + BATCH, candidates.length)}/${candidates.length} (updated=${updated} failed=${failed})`);
  }

  console.log(`\nWRITE 완료: updated=${updated} failed=${failed}`);
  if (errors.length > 0) {
    console.log('첫 5건 에러:');
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
  }
  console.log('\nrollback SQL:');
  console.log('  UPDATE predictions SET scoring_rule=\'v1.8\'');
  console.log('  WHERE scoring_rule=\'v1.8-credit-fail\';');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
