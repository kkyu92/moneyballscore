이번 사이클의 회고를 실행하고, 다음 사이클의 입력을 준비하세요.

1. **CHANGELOG.md 업데이트**
   - git log에서 마지막 /compound 이후 커밋들을 확인
   - 사용자에게 보이는 변경사항 위주로 항목 추가
   - 버전 번호 올리기 (patch: 버그/수정, minor: 기능, major: 대규모 변경)

2. **회고 작성 (docs/retros/YYYY-MM-DD-vX.X.X.md)**
   - 이번 사이클에서 무엇을 했는지 (What)
   - 어떤 결정을 내렸고 왜 그랬는지 (Decisions)
   - 뭐가 잘 됐는지 (Worked)
   - 뭐가 안 됐는지 (Didn't work)
   - 다음에 할 만한 것 후보 3가지 (Next candidates) — 이것이 다음 세션의 입력 큐

3. **솔루션 기록 (안티패턴 발견 시)**
   - docs/solutions/ 에 카테고리별 마크다운 작성
   - 문제 → 원인 → 해결 → 교훈 구조

4. **메모리 업데이트**
   - CLAUDE.md에 이번 사이클에서 배운 규칙/패턴 반영
   - outdated된 정보 제거

5. **결과 요약 출력**
   - 버전: vX.X.X
   - 커밋 수: N개
   - 회고 파일: docs/retros/...
   - 다음 후보: 3가지 나열
