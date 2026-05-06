/**
 * 한국어 조사 자동 선택 — 받침 유무 판별 helper.
 *
 * 룰:
 *   - Hangul 음절 (가-힣): (charCode - 0xAC00) % 28 != 0 이면 받침 있음
 *   - 디지트 (0-9): 한국어 한자 읽기 (영/일/이/삼/...) 의 받침 유무 lookup
 *   - 영문 약어 (KBO 팀 등): 발음 lookup (LG=엘지, KIA=기아 ...)
 *   - 미지 입력: 받침 없음 (기본 와/가/로) 으로 처리
 *   - 공백/문장부호: 마지막 의미 있는 character 까지 skip
 */

// 영문 약어 발음의 받침 유무.
// 모든 KBO 팀 약어 마지막 알파벳 발음은 받침 X — 엘지, 기아, 케이티, 엔씨, 에스에스지.
const ENGLISH_TOKEN_HAS_BATCHIM: Record<string, boolean> = {
  SSG: false,
  KIA: false,
  LG: false,
  KT: false,
  NC: false,
  SK: false,
};

// 한국어 디지트 한자 읽기 받침 유무.
// 영(ㅇ) 일(ㄹ) 이 삼(ㅁ) 사 오 육(ㄱ) 칠(ㄹ) 팔(ㄹ) 구
const DIGIT_HAS_BATCHIM: readonly boolean[] = [
  true,  // 0: 영 (ㅇ)
  true,  // 1: 일 (ㄹ)
  false, // 2: 이
  true,  // 3: 삼 (ㅁ)
  false, // 4: 사
  false, // 5: 오
  true,  // 6: 육 (ㄱ)
  true,  // 7: 칠 (ㄹ)
  true,  // 8: 팔 (ㄹ)
  false, // 9: 구
];

// ㄹ 받침 디지트 — "(으)로" 시 "로" 처리되는 예외.
const DIGIT_IS_RIEUL: readonly boolean[] = [
  false, true, false, false, false, false, false, true, true, false,
];

const HANGUL_BASE = 0xAC00;
const HANGUL_LAST = 0xD7A3;
const HANGUL_RIEUL_JONG_INDEX = 8;

/**
 * word 마지막 의미 있는 character 의 받침 유무 판별.
 * 후행 공백 / 문장부호 skip 후 마지막 character 분석.
 * 영문 약어는 token 단위 (연속 영문) lookup, 미지는 받침 없음 처리.
 */
export function hasJongsung(word: string): boolean {
  if (!word) return false;
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i];
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      return ((code - HANGUL_BASE) % 28) !== 0;
    }
    if (ch >= '0' && ch <= '9') {
      return DIGIT_HAS_BATCHIM[code - 48];
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j > 0 && /[A-Za-z]/.test(word[j - 1])) j--;
      const token = word.slice(j, i + 1).toUpperCase();
      return ENGLISH_TOKEN_HAS_BATCHIM[token] ?? false;
    }
    // 공백 / 문장부호 / 기타 — skip 후 다음 character 검사
  }
  return false;
}

/**
 * 마지막 의미 있는 character 가 ㄹ 받침인지 판별.
 * "(으)로" 처리 시 ㄹ 은 "로" 로 처리됨 (받침 없음과 동일 취급).
 */
function hasRieulJongsung(word: string): boolean {
  if (!word) return false;
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i];
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      return ((code - HANGUL_BASE) % 28) === HANGUL_RIEUL_JONG_INDEX;
    }
    if (ch >= '0' && ch <= '9') {
      return DIGIT_IS_RIEUL[code - 48];
    }
    if (/[A-Za-z]/.test(ch)) {
      // KBO 팀 약어 발음 ㄹ 종성 케이스 없음
      return false;
    }
  }
  return false;
}

/**
 * 조사 자동 선택. word 의 받침 유무에 따라 hasBatchim/noBatchim 중 선택.
 *
 * 사용 예 (와/과, 이/가, 은/는):
 *   josa("LG", "과", "와")     → "와"
 *   josa("두산", "과", "와")   → "과"
 *   josa("롯데", "이", "가")   → "가"
 *   josa("키움", "이", "가")   → "이"
 *   josa("LG", "은", "는")     → "는"
 */
export function josa(word: string, hasBatchim: string, noBatchim: string): string {
  return hasJongsung(word) ? hasBatchim : noBatchim;
}

/**
 * "(으)로" 전용 조사. ㄹ 받침은 "로" 로 처리하는 한국어 예외 적용.
 *
 * 사용 예:
 *   ro("LG")    → "로"   (받침 없음)
 *   ro("두산")   → "으로" (ㄴ 받침)
 *   ro("서울")   → "로"   (ㄹ 받침 예외)
 *   ro("1-0")   → "으로" (영, ㅇ 받침)
 *   ro("2-1")   → "로"   (일, ㄹ 받침 예외)
 *   ro("5-3")   → "으로" (삼, ㅁ 받침)
 */
export function ro(word: string): string {
  if (hasRieulJongsung(word)) return '로';
  return hasJongsung(word) ? '으로' : '로';
}
