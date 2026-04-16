#!/bin/bash
# v4-3 자연 발화 헬스체크 — 경기 종료 후 실행
# Usage: ./scripts/check-v43-health.sh [date]
# Default: yesterday (KST)

set -euo pipefail

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://utmimgpccbrciwuuacyw.supabase.co}"
API_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY required}"

DATE="${1:-$(TZ=Asia/Seoul date -v-1d +%Y-%m-%d 2>/dev/null || TZ=Asia/Seoul date -d 'yesterday' +%Y-%m-%d)}"
echo "=== v4-3 Health Check for $DATE ==="
echo ""

# Helper
query() {
  curl -s "$SUPABASE_URL/rest/v1/$1" \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0"
}

query_json() {
  curl -s "$SUPABASE_URL/rest/v1/$1" \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY"
}

# A) Postview 자동 생성 확인
echo "[A] post_game predictions:"
POSTGAME=$(query_json "rpc/execute_sql" 2>/dev/null || echo "RPC_UNAVAILABLE")
# Fallback: direct query
PG_COUNT=$(query_json "predictions?prediction_type=eq.post_game&select=id&game_id=not.is.null" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
echo "  Total post_game rows: $PG_COUNT"

# B) 최근 post_game 샘플
echo ""
echo "[B] Latest post_game sample:"
query_json "predictions?prediction_type=eq.post_game&select=game_id,created_at&order=created_at.desc&limit=3" | python3 -m json.tool 2>/dev/null || echo "  (no data)"

# C) agent_memories 확인
echo ""
echo "[C] agent_memories:"
MEM_COUNT=$(query_json "agent_memories?select=id" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
echo "  Total agent_memories rows: $MEM_COUNT"

# Team distribution
echo "  By team:"
query_json "agent_memories?select=team_code,memory_type&order=team_code" | python3 -c "
import json,sys
from collections import Counter
data = json.load(sys.stdin)
teams = Counter(d['team_code'] for d in data)
for team, count in sorted(teams.items()):
    print(f'    {team}: {count}')
" 2>/dev/null || echo "  (no data)"

# D) GitHub Actions live-update 확인
echo ""
echo "[D] live-update.yml: Check GitHub Actions manually"
echo "  https://github.com/kkyu92/moneyball-ecosystem/actions/workflows/live-update.yml"

# E) UNIQUE 제약 중복 체크
echo ""
echo "[E] Duplicate agent_memories check:"
query_json "agent_memories?select=team_code,memory_type,content" | python3 -c "
import json,sys
from collections import Counter
data = json.load(sys.stdin)
keys = Counter((d['team_code'], d['memory_type'], d['content']) for d in data)
dupes = {k: v for k, v in keys.items() if v > 1}
if dupes:
    print(f'  WARNING: {len(dupes)} duplicates found!')
    for k, v in dupes.items():
        print(f'    {k}: {v}x')
else:
    print('  OK — no duplicates')
" 2>/dev/null || echo "  (check failed)"

echo ""
echo "=== Done ==="
