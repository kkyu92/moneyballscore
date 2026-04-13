오늘 완료된 KBO 경기 결과를 수집하고, 예측 적중 여부를 업데이트하고, 리뷰 포스트를 생성하세요.

1. KBO 공식 사이트에서 오늘 경기 최종 스코어 수집
2. games 테이블 업데이트 (status: 'final', 스코어, 승리팀)
3. predictions 테이블에서 is_correct, actual_winner 업데이트
4. accuracy_tracking 일별 집계 갱신
5. 경기별 리뷰 포스트 생성 (예측 vs 실제 비교 분석)
6. 적중률 변화 요약 보고
