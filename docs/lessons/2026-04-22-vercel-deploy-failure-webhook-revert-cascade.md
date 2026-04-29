# lesson: Vercel 배포 실패 → webhook 통합 코드 rapid iteration + revert cascade

## 현상

2026-04-22 Sentry alert-rule webhook 통합 작업 중 main 직접 push 3회 연속:

| commit | 내용 |
|---|---|
| `787abfa` | fix(hub-dispatch): Sentry rule 저장 시 validation ping 200 OK |
| `22fd95e` | fix(hub-dispatch): /webhook 서브경로 명시적 wrap |
| `1e80b78` | fix(hub-dispatch): /webhook 서브경로 추가 (Sentry alert-rule-action) |

`1e80b78` 배포 시 Vercel 배포 실패 → `vercel-deploy-error-dispatch.yml` 발동 →
fingerprint `vercel-deploy-1e80b78` 로 허브 incident 박제.
이후 역순 revert 3건:

| commit | 내용 |
|---|---|
| `465a948` | Revert "fix(hub-dispatch): /webhook 서브경로 추가" |
| `7cfb4e3` | Revert "fix(hub-dispatch): /webhook 서브경로 명시적 wrap" |
| `7fa4f4d` | Revert "fix(hub-dispatch): Sentry rule 저장 시 validation ping 200 OK" |

6건 커밋 모두 main 직접 push. CI type-check 가 PR 없이 실행 안 됨.
배포 실패의 근본 원인 (빌드 에러 or 런타임 에러) 은 로컬 검증 없이는 판별 불가.

## 원인

1. **로컬 빌드 검증 없이 push**: `pnpm build` 또는 `pnpm type-check` 없이 main push
2. **PR 없이 main 직접 push**: CI type-check 가 PR 기반으로만 실행되므로 우회됨
3. **Webhook 통합의 복잡성 과소평가**: Sentry alert-rule validation ping 은 저장 시
   200 OK 가 필요 — 코드만 바꾼다고 동작하지 않음. Sentry 대시보드 설정과 동시 업데이트 필요.
4. **관측 인프라와 연동 코드의 결합**: Sentry DSN + 허브 webhook URL + Next.js route 3개가
   맞물려야 동작 → 하나라도 어긋나면 배포 실패 or 무응답

## 해결

당시 적용한 해결책은 "전부 revert". 이후 Sentry 통합은 다른 방식으로 재접근
(서버사이드 `captureException` + `beforeSend` 훅 방식, 드리프트 사례 6 참조).

## 예방 체크리스트

- Webhook 핸들러 코드 변경 시 **`pnpm build` 로컬 성공 확인** 후 push
- 배포 실패 위험이 있는 변경은 **PR 경유** → CI type-check 자동 실행
- Sentry alert-rule 같이 외부 서비스가 validation ping 을 보내는 경우:
  코드 merge 와 외부 설정 동시 업데이트 순서 설계 후 진행
- Rapid iteration (2분 간격 push 3회) 패턴 감지 시 멈추고 로컬에서 원인 파악 먼저

## 관련

- 드리프트 사례 6 (CLAUDE.md) — 관측 인프라 silent 실패 (Sentry 통합 전반)
- PR flow: `pull-b` 인바운드 자동화 PR (`2e8ace6`) 은 정상 deploy → webhook URL fix 만 실패
- fingerprint: `vercel-deploy-1e80b78`
- Issue #15 (moneyballscore repo) — lesson pending reminder D5
