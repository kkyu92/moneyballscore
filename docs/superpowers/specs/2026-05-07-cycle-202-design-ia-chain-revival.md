# cycle 202 spec — 디자인 + 웹사이트 구조 차원 chain 부활 + 신규 IA chain 추가

**날짜**: 2026-05-07
**chain**: skill-evolution (12회째 자가 진화)
**trigger**: 4 — `meta-pattern` body 에 "SKILL 갱신 필요" (사용자 명시 발화 = "디자인적인 요소와 웹 사이트 구조 개선도 좀 더 추가했으면 좋겠다 참고해서 추천으로 진행")
**기존 박제 충돌**: cycle 135 / 150 의 "0회 chain 5개 의도된 결과 항구화" 가설 일부 무너짐

---

## 진단 evidence

cycle 1~201 회고 직후 사용자 명시 = "디자인 요소 + 사이트 구조 개선 추가". 회고 보고 한계 5번 ("product 차원 사용자 향 임팩트 측정 부재") 에 대한 사용자 회신.

기존 박제 (cycle 135 skill-evolution 9):

> 0회 chain 5개 (polish-ui / op-analysis / dim-cycle / expand-scope / design-system) 의도된 결과 인정 항구화 (cycle 61/68 박제 재현 — DESIGN.md mtime 0.6일 / TODOS "큰 방향" 0건 / docs/design 디렉토리 부재 / op-analysis 직전 발화 cycle 86 49 cycle 전 / dim-cycle fallback only — trigger 강화 X)

사용자 명시 발화 = "의도된 결과" 가설 일부 무너짐. polish-ui / design-system 두 chain 의 trigger 강화 + 신규 IA chain 도입 정당성 확보.

회고 보고에서 식별된 사이트 IA 한계:
- 라우트 31개 (page 24 + route 7) 가 사용자 navigation flow 측정 채널 부재
- 카테고리 hub 진입 path 약함 (헤더 메가메뉴 / 푸터 sitemap 컬럼 부재)
- DESIGN.md (5722 bytes, mtime 2026-05-05) 토큰 정의 풍부하지만 실제 컴포넌트 구현 일관성 측정 채널 부재
- polish-ui cycle 122 이후 0회 발화 = cycle 91~122 carry-over fatigue 7회 PARTIAL streak 후 항구화

## 변경 영역 (SKILL.md 4건)

### 1. chain pool table — `polish-ui` trigger 강화

**기존**:
> 진단 = 작은 UI 이슈 / 디자인 부채 / 디자인 일관성 균열 (시스템 레벨 X) / DESIGN.md token (color/spacing) vs 실제 컴포넌트 grep diff / 사용자 자연 발화 design 신호 ("어색"/"이상"/"안 예뻐"/"polish") / Sentry 클라이언트 UI 에러 패턴

**갱신**:
- 사용자 자연 발화 source 확장 — "디자인 요소 추가" / "ui 다듬어" / "더 폴리시" / "디자인 더" / "구조 개선" 등 명시적 발화 trigger 추가 (cycle 202 사용자 명시 박제)
- 신규 라우트 추가 또는 신규 컴포넌트 디렉토리 생성 직후 7일 안 polish-ui 0회 발화 시 자연 발화 trigger 추가

### 2. chain pool table — `design-system` trigger 강화

**기존**:
> (1) `DESIGN.md` 갱신 ≥ 4주 (자동 측정: `stat -f %m DESIGN.md`) (2) 새 area 디자인 spec 부재 (`docs/design/<area>.md` 없음) (3) 사용자 발화 ("디자인 다듬어" / "shotgun 돌려줘" / "디자인 시스템") (4) `meta-pattern` = "design chain 0회 N 사이클" (5) DESIGN.md token vs 컴포넌트 균열 grep (color/spacing 문자열 mismatch)

**갱신**:
- 사용자 자연 발화 source 확장 — "디자인 시스템 더" / "디자인 차원 강화" / "디자인 / 구조 개선" 등 강한 명시 발화 (cycle 202 박제)
- 신규 routing depth 추가 (1 cycle 안 신규 라우트 ≥3) 시 자연 발화 trigger 추가 — IA 변동 시 design system 동기 필요

### 3. chain pool table — 신규 `info-architecture-review` chain 추가 (10번째 chain)

| 항목 | 내용 |
|---|---|
| chain slug | `info-architecture-review` |
| trigger | (1) 라우트 신규 추가 ≥3 / 1주 (`find apps/moneyball/src/app -name page.tsx -mtime -7`) (2) breadcrumb 누락 라우트 grep (`grep -L Breadcrumb apps/moneyball/src/app/**/page.tsx`) (3) 사용자 발화 ("구조" / "navigation" / "메뉴" / "사용자 path" / "사이트 구조") (4) `meta-pattern` body 에 "IA / navigation 약함" (5) sitemap.xml 동기 깨짐 (`pnpm run build` 후 sitemap URL 수 vs 실제 page.tsx 수 mismatch) |
| 시퀀스 | 진단 (라우트 깊이 / breadcrumb / 카테고리 hub / footer sitemap 컬럼 / 헤더 메가메뉴) → spec write (`docs/design/ia-<slug>.md`) → 구현 (Breadcrumb 추가 / hub page 작성 / footer 갱신 등) → `/ship` |
| 멈춤 조건 | IA 개선 PR 박제 + R7 머지 (success) / spec only 사용자 review (partial) / "현 IA 충분" → retro-only |

### 4. 진단 source table — `info-architecture-review` 행 추가

| chain | 진단 source |
|---|---|
| `info-architecture-review` | 라우트 신규 추가 (`find apps/moneyball/src/app -name page.tsx -mtime -7`) / breadcrumb 누락 grep / 헤더 메가메뉴 / 푸터 sitemap 컬럼 / sitemap.xml 동기 / 사용자 navigation 발화 |

### 5. 마이그레이션 path — cycle 202 박제

cycle 201 후속 direct trigger — fix-incident chain 으로 SKILL.md 변경 후속 1 cycle 만에 사용자 명시 발화 = trigger 4 자동 발화. milestone 50/100/124/135/150/200/201 sequence 에 cycle 202 추가 박제. chain pool 9개 → 10개. skill-evolution 자가 진화 12회 누적.

### 6. top summary line 6 — chain pool 9 → 10 + skill-evolution 12회

기존 "chain pool 9개" → "chain pool 10개" / "skill-evolution 11회 자가 진화" → "skill-evolution 12회 자가 진화 (cycle 46/49/51/58/61/68/100/124/135/150/201/202)"

---

## 실행 step

1. SKILL.md Edit 6 영역 (line 6 / 62 / 67 / 67 뒤 / 209 뒤 / 540 끝)
2. spec 파일 박제 (본 파일)
3. `pnpm test` smoke (영향 X 확인)
4. commit `feat(skill): cycle 202` + branch `develop-cycle/skill-evolution-202` + PR + R7
5. cycle_state 박제 — `~/.develop-cycle/cycles/202.json`

## 다음 cycle 자연 진입 예상

cycle 203 = 사용자 manual `/develop-cycle 1` fire → 진단 단계 = 신규 chain `info-architecture-review` trigger source 측정 (라우트 31개 / breadcrumb grep / 헤더 메가메뉴 부재 / 푸터 sitemap 컬럼 부재) → 자연 매핑.

또는 polish-ui chain 자연 매핑 (DESIGN.md token vs 실제 컴포넌트 raw hex grep 균열 측정). 본 메인 자율 결정.

## R5 evidence

본 cycle = R5 메타 패턴 7번째 evidence. cycle 201 fix (chain 시퀀스 sub-skill AskUserQuestion 가드) 가 SKILL 갱신 채널 자체 정상 작동 검증 → cycle 202 즉시 후속 SKILL 갱신 = chain pool / trigger source 차원 갱신. 매 fix 가 다음 layer 노출 + 후속 자연 갱신 sequence.

## 박제

- `~/.claude/skills/develop-cycle/SKILL.md` (글로벌, repo 밖) 4 영역 갱신
- `docs/superpowers/specs/2026-05-07-cycle-202-design-ia-chain-revival.md` (본 파일, repo 안 spec 동기)
- `~/.develop-cycle/cycles/202.json` (cycle_state)
- PR `develop-cycle/skill-evolution-202` (R7 자동 머지)
