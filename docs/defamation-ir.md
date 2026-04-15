# 명예훼손 IR (Incident Response) 절차

**작성일**: 2026-04-15 (Phase v4-4)
**버전**: v1
**적용 범위**: AI 에이전트 토론 시스템(Phase v4-2 이후)의 LLM 생성 콘텐츠 전반

## 목적

AI 에이전트가 생성한 reasoning·블로그 분석문이 **특정 선수·코칭스태프·구단에 대한 명예훼손 또는 허위사실**을 포함할 경우 24시간 이내 대응할 수 있는 체계를 수립.

## 범위

### 대상 콘텐츠
- `predictions.reasoning.debate.verdict.reasoning` (Sonnet 심판 최종 분석)
- `predictions.reasoning.debate.homeArgument.reasoning` / `awayArgument.reasoning` (Haiku 팀 에이전트)
- `predictions.reasoning.debate.calibration` (회고 보정)
- `predictions.reasoning` (post_game 사후 분석 + factorErrors + judgeReasoning)
- `agent_memories.content` (Compound 루프 학습 메모리)
- 블로그 자동 생성 포스트 (posts 테이블)

### 대상 리스크
- **명예훼손**: "X 선수는 게으르다", "Y 감독은 무능하다" 등
- **허위사실**: 실제와 다른 부상·성적·개인 정보
- **차별적 표현**: 국적·학력·가정환경 관련
- **범죄 의심**: 승부조작·금지약물 등 근거 없는 암시
- **프라이버시 침해**: 공개되지 않은 개인 정보

## 탐지 채널

### 1. 자동 (v4-2 이후)
- `validator.ts` Layer 1: 금칙어 regex (`BANNED_PATTERNS`) — 멘탈/팬심/자신감/프로답지/성실한/집중력/왕조/무관/전통적으로
- `/debug/hallucination` 대시보드: 최근 7일 validator reject 이벤트 (v4-4)

### 2. 수동
- **사용자 신고**: kyusikkyu@gmail.com
- **운영자 정기 점검**: 주 1회 샘플 5건 수동 검수 (추천)
- **법무 요청**: 공식 통지 (등기우편, 이메일)

## 대응 절차 (24시간 이내)

### Step 1 — 즉시 unpublish (0~1시간)

문제 된 콘텐츠가 프로덕션에 노출 중이면 **최우선 차단**:

#### A. 예측 row의 reasoning 제거
```sql
UPDATE predictions
SET reasoning = '{"debate":null,"notice":"검토 중"}'::jsonb
WHERE id = {problem_prediction_id};
```

#### B. 블로그 포스트 unpublish
```sql
UPDATE posts
SET status = 'draft'
WHERE id = {problem_post_id};
```

#### C. agent_memories 해당 row 삭제 (Compound 루프 오염 차단)
```sql
DELETE FROM agent_memories
WHERE id = {problem_memory_id};
-- 또는 해당 team_code 전체:
DELETE FROM agent_memories WHERE team_code = '{TEAM}' AND content LIKE '%{키워드}%';
```

#### D. Vercel ISR 즉시 revalidate
```bash
curl -X POST "https://moneyballscore.vercel.app/api/revalidate" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"paths":["/","/analysis/game/{game_id}","/predictions"]}'
```

### Step 2 — 사고 기록 (1~3시간)

`docs/incidents/{YYYY-MM-DD}-{slug}.md` 파일 생성:

```markdown
# Incident {date} - {slug}

## 요약
- 발견: {time}
- 유형: 명예훼손 / 허위사실 / 차별 / 기타
- 대상 콘텐츠: predictions.id={N}, posts.id={N}, agent_memories.id={N}
- 피해 대상: {선수/코치/구단명}

## 재현
- 원본 문구: "…"
- 스크린샷 / DB dump

## 원인 분석
- Backend: Claude | DeepSeek | Ollama
- Prompt: persona 파일 버전
- 입력 컨텍스트: GameContext snapshot
- Validator 통과 이유

## 조치
- [ ] unpublish (Step 1)
- [ ] validator 금칙어 추가
- [ ] 페르소나 프롬프트 수정
- [ ] 영향 범위 재스캔
- [ ] 사용자 통지 (필요 시)
```

### Step 3 — validator 강화 (3~12시간)

#### A. 금칙어 regex 확장
`packages/kbo-data/src/agents/validator.ts`의 `BANNED_PATTERNS` 배열에 신규 패턴 추가:

```ts
const BANNED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // 기존 패턴들...
  { pattern: /신규문제표현/, label: '신규 차단' },
];
```

#### B. 페르소나 프롬프트 수정
`packages/kbo-data/src/agents/personas.ts`의 `BASE_PROMPT`에 명시적 금지 사항 추가:

```
## 절대 금지
- 선수 개인의 성격·태도·사생활 평가
- 확인되지 않은 부상·약물·승부조작 언급
- 국적·학력·가족 관련 표현
- ...
```

#### C. 테스트 추가
신규 패턴이 실제로 reject하는지 unit test 추가:

```ts
it('신규 금칙어 패턴 reject', () => {
  const arg = makeArg({ reasoning: '신규문제표현이 포함됨' });
  const r = validateTeamArgument(arg, ctx);
  expect(r.ok).toBe(false);
});
```

### Step 4 — 영향 범위 재스캔 (12~24시간)

과거 reasoning에 동일 패턴이 있었는지 SQL 스캔:

```sql
SELECT id, game_id, reasoning->>'debate' AS debate
FROM predictions
WHERE reasoning::text LIKE '%{문제 키워드}%'
  AND prediction_type = 'pre_game'
ORDER BY created_at DESC;
```

- 발견 시 Step 1 반복 (일괄 unpublish)
- 블로그 포스트 동일 스캔
- agent_memories 동일 스캔

### Step 5 — 사용자 통지 (필요 시)

- **법적 의무 발생 시** (공식 통지서 수령 후): 피해 당사자에게 처리 결과 회신 (공식 채널)
- **자발적 통지**: 블로그 footer에 "수정 이력" 섹션 공지
- **심각한 경우** (소송 위험): 법무 상담 → 변호사 연락

## 예방 워크플로 (일상 운영)

### 매주 월요일 — Hallucination Dashboard 체크
```
1. https://moneyballscore.vercel.app/debug/hallucination (BASIC auth 필수)
2. 최근 7일 reject 건수 확인
3. 사유별 분포가 평소보다 급증했나?
4. 샘플 20건 중 명예훼손 의심 문구 있나?
5. 발견 시 이 IR 절차 발동
```

### 매월 1일 — 전체 reasoning 샘플 검수
```
1. 랜덤 10건 predictions.reasoning SELECT
2. 사람이 읽고 유해 표현 없는지 확인
3. 발견 시 validator 강화
```

## 연락처 및 권한

### 운영자 (solo developer)
- 이름: 김규식 (Kyusik Kim)
- 이메일: kyusikkyu@gmail.com
- 권한: DB 전체, Vercel 배포, Supabase, 전체 IR 실행

### 법적 자문
- 현재 미지정 — 공식 통지서 수령 시 변호사 검색 필요
- 참고: 한국인터넷진흥원(KISA) 인터넷 침해사고 대응센터

### 에스컬레이션 시점
- 공식 법적 통지 수령 시 → 변호사 즉시 연락
- 언론 보도 시 → 법적 자문 + 공식 성명
- 동일 패턴 3건 이상 반복 시 → 페르소나·validator 전면 재검토

## 버전 이력

- **v1 (2026-04-15)**: 최초 작성. Phase v4-4 UI 노출 이전 안전망 구축.
- 향후: v5에서 LLM 기반 자동 명예훼손 감지 도입 예정 (2차 검증 레이어)
