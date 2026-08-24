// `shouldNotifyPipelineStatus` — daily.ts finish() 의 Telegram status 발화 predicate.
//
// cycle 1191 wave 20 — predict mode 가 predictionsGenerated=0 이지만 errors[]
// 가 채워진 경우 silent. 12 시간 후 predict_final 에서 silent-drift-alert.ts
// 가 fire 하기 전까지 사용자 가시 채널 부재 → 매시간 cron silent halt 누락.
//
// 기존 predicate (cycle 813 박제):
//   (predict + predictionsGenerated>0) || predict_final || verify
// 신규 predicate (cycle 1191 wave 20):
//   (predict + (predictionsGenerated>0 || errors>0)) || predict_final || verify
//
// 예: predict mode @ KST 10:00 — FancyStats ECONNREFUSED (errors=['FancyStats: ...'],
// predictionsGenerated=0) → 기존 동작 = Telegram silent. 신규 동작 = "❌ 실패"
// Telegram 즉시 발사 → 사용자가 KST 22:00 predict_final 까지 기다리지 않고 대응.
//
// trade-off: 매 cron silent halt 시 최대 12 알림/일 (predict UTC 01-12). 단
// errors[].length>0 = 명시적 실패 evidence (legitimate window_too_early /
// already_predicted 는 errors=[] 유지 → 알림 X). 사용자 가시 우선 + spam
// risk 는 errors[] 비어있는 정상 path 에선 발생 안함.

// mode 는 실제로는 항상 daily.ts 의 PipelineMode(4종) 만 넘어오지만, 아래 분기가
// 미인식 문자열을 전부 false 로 방어하는 predicate 라 타입도 string 으로 열어둠 —
// PipelineMode 로 좁히면 이 함수 자체 방어 로직(announce/mlb_*/기타 = silent)을
// 테스트할 방법이 타입 레벨에서 막힘.
export function shouldNotifyPipelineStatus(
  mode: string,
  predictionsGenerated: number,
  errorsCount: number,
): boolean {
  if (mode === 'predict') {
    return predictionsGenerated > 0 || errorsCount > 0;
  }
  if (mode === 'predict_final' || mode === 'verify') {
    return true;
  }
  return false;
}
