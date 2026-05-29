# Plan #19 — phase 2 carry-over 분리 (Footer + 메가메뉴 + shadcn token + a11y)

**Status**: approved (1-pager, multi-cycle fire path 박제)
**Created**: 2026-05-29 (cycle 1041)
**Parent plan**: #14 phase 2 (cycle 1020 ship_history "별도 plan 분리 권장 (M-L 비용)")
**Target chain**: info-architecture-review (heavy) + design-system (영구 opt-out 흡수 자율)
**Plan body**: `~/.develop-cycle/plans/moneyballscore/19.md`

## 배경

plan #14 phase 2 (C2) cycle 1020 ship 시 Step 0 (IA hierarchy 룰) + Step 1 부분 (Footer prop type) 진행. 잔여 Step 0.5 / Step 1 / Step 2 / Step 4 = M-L 비용 4 step 자율 영역 carry-over. cycle 1021~1040 = 20 cycle 미진행. 본 plan 분리로 multi-cycle fire path 박제.

Step 3 (breadcrumb 누락 라우트 추가) = cycle 1020 self_verification_finding "누락 0건 PASS" 이미 closure. 본 plan 범위 X.

## 4 step 통합 spec

| Step | 의도 | 작업 | 예상 cycle |
|---|---|---|---|
| 0.5 | shadcn token override 매핑 | shadcn install + `docs/design/shadcn-token-override.md` + globals.css override | 1 |
| 1 | Footer wireframe + accordion | Footer.tsx ASCII wireframe + prop type + a11y heading + responsive | 1 |
| 2 | SiteHeader 메가메뉴 shadcn rewrite | RSC + Client 격리 + shadcn `<NavigationMenu>` + 상태 매트릭스 12 case + 메가메뉴 spec | 1 |
| 4 | interaction + axe-core test | Footer/SiteHeader/Breadcrumb interaction test + axe-core a11y violation 0 | 1 |

총 4 cycle 분산 fire 권장 (1 cycle 안 fire X — M-L 비용 분산 + carry-over drift mitigation).

## 자가 검증 (5축 rubric)

- **가치**: high (3축 사용자 가시 — Footer sitemap UX + 헤더 메가메뉴 IA 깊이 + a11y AA WCAG 통과)
- **시간 비용**: M-L (4 step 분산, 각 30-60분, 합 2-4 시간)
- **risk**: 2 (shadcn brand token override 누락 risk + RSC boundary 위반 risk + axe-core test infra silent drift)
- **자율 가능**: yes (4 step 모두 본 메인 자율 영역)
- **의존성**: 단일 (chain pool info-architecture-review heavy + design-system 자연 발화)

## parent_plan_decisions_carryover

plan #14 Decision Audit Trail 안 phase 2 / RSC boundary 관련 decision 5건 carry-over:

1. **#6 Design (Mechanical, P1)**: IA hierarchy 룰 = cycle 1020 ship — 본 plan 적용 base
2. **#7 Design (Mechanical, P5)**: wireframe + prop spec — Step 1 본 plan body 안 ASCII wireframe + prop type signature 박제 의무
3. **#8 Design (Mechanical, P1)**: ARIA + axe-core test — Step 4 본 plan body 안 명시 + a11y violation 0 의무
4. **#9 Design (Mechanical, P5)**: shadcn token override 매핑 — Step 0.5 본 plan body 안 DESIGN.md Contrast 표 8 조합 매핑 의무 (silent drift family 7 차단)
5. **#17 Eng (Mechanical, P5)**: MegaMenuMobile 'use client' 격리 — Step 2 SiteHeader Server Component 유지 + 자식 'use client' 격리 명시 의무 (RSC boundary)

## Success criteria

- 4 step 모두 ship (Step 0.5 + 1 + 2 + 4) + axe-core a11y violation 0 + CI green PASS
- 사용자 가시 = Footer sitemap UX 강화 + 헤더 메가메뉴 IA 깊이 회수 + a11y AA WCAG 통과
- silent drift family 7 (DESIGN.md token vs 실제 컴포넌트 grep 균열) detection channel 강화
- plan #14 phase 2 carry-over closure → plan #14 status=phase_2_split_to_plan_19_cycle_1041 갱신 (본 cycle 1041 완료)

## Carry-over path

- 본 cycle 1041: plan #19 박제 + 1-pager 박제 (본 docs) + plan #14 status 갱신 → ship + R7 머지
- 다음 cycle (info-architecture-review heavy 또는 design-system fire 시점): Step 0.5 fire
- +1 cycle: Step 1 fire
- +1 cycle: Step 2 fire
- +1 cycle: Step 4 fire

총 ETA: 5 cycle (본 cycle 박제 + 4 step fire).
