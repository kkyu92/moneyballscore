import { describe, it, expect } from 'vitest';
import { hasJongsung, josa, ro } from './korean';

describe('hasJongsung — Hangul', () => {
  it('받침 없음 음절', () => {
    expect(hasJongsung('가')).toBe(false);
    expect(hasJongsung('데')).toBe(false);
    expect(hasJongsung('롯데')).toBe(false);
    expect(hasJongsung('한화')).toBe(false);
  });

  it('받침 있는 음절', () => {
    expect(hasJongsung('각')).toBe(true);
    expect(hasJongsung('산')).toBe(true);
    expect(hasJongsung('두산')).toBe(true);
    expect(hasJongsung('삼성')).toBe(true);
    expect(hasJongsung('키움')).toBe(true);
  });
});

describe('hasJongsung — 영문 약어 (KBO 팀 발음)', () => {
  it('등록 KBO 약어 — 마지막 발음 받침 X', () => {
    expect(hasJongsung('LG')).toBe(false);
    expect(hasJongsung('KIA')).toBe(false);
    expect(hasJongsung('SSG')).toBe(false);
    expect(hasJongsung('KT')).toBe(false);
    expect(hasJongsung('NC')).toBe(false);
    expect(hasJongsung('SK')).toBe(false);
  });

  it('미지 영문 약어 default 받침 없음', () => {
    expect(hasJongsung('XYZ')).toBe(false);
    expect(hasJongsung('ABC')).toBe(false);
  });

  it('대소문자 무관', () => {
    expect(hasJongsung('lg')).toBe(false);
    expect(hasJongsung('Kia')).toBe(false);
  });
});

describe('hasJongsung — 영문 약어 (세이버메트릭스)', () => {
  it('피 받침 ㅍ — FIP / XFIP', () => {
    expect(hasJongsung('FIP')).toBe(true);
    expect(hasJongsung('XFIP')).toBe(true);
    expect(hasJongsung('xFIP')).toBe(true);
  });

  it('받침 없음 — WOBA / WAR / ELO', () => {
    expect(hasJongsung('WOBA')).toBe(false);
    expect(hasJongsung('wOBA')).toBe(false);
    expect(hasJongsung('WAR')).toBe(false);
    expect(hasJongsung('ELO')).toBe(false);
    expect(hasJongsung('Elo')).toBe(false);
  });

  it('알 ㄹ 받침 — SFR', () => {
    expect(hasJongsung('SFR')).toBe(true);
  });
});

describe('hasJongsung — 디지트 한자 읽기', () => {
  it('받침 있는 디지트', () => {
    expect(hasJongsung('0')).toBe(true);  // 영 ㅇ
    expect(hasJongsung('1')).toBe(true);  // 일 ㄹ
    expect(hasJongsung('3')).toBe(true);  // 삼 ㅁ
    expect(hasJongsung('6')).toBe(true);  // 육 ㄱ
    expect(hasJongsung('7')).toBe(true);  // 칠 ㄹ
    expect(hasJongsung('8')).toBe(true);  // 팔 ㄹ
  });

  it('받침 없는 디지트', () => {
    expect(hasJongsung('2')).toBe(false);
    expect(hasJongsung('4')).toBe(false);
    expect(hasJongsung('5')).toBe(false);
    expect(hasJongsung('9')).toBe(false);
  });
});

describe('hasJongsung — 후행 공백 / 문장부호 skip', () => {
  it('후행 공백 무시', () => {
    expect(hasJongsung('LG  ')).toBe(false);
    expect(hasJongsung('두산\t')).toBe(true);
  });

  it('후행 문장부호 skip 후 의미 있는 char', () => {
    expect(hasJongsung('(취소 1경기 제외)')).toBe(false); // '외' 받침 X
    expect(hasJongsung('(LG)')).toBe(false);
    expect(hasJongsung('두산.')).toBe(true);
  });

  it('스코어 표기 — 마지막 디지트 분석', () => {
    expect(hasJongsung('5-3')).toBe(true);  // 3=삼 ㅁ
    expect(hasJongsung('5-2')).toBe(false); // 2=이
    expect(hasJongsung('1-0')).toBe(true);  // 0=영 ㅇ
  });

  it('빈 문자열 / 공백만', () => {
    expect(hasJongsung('')).toBe(false);
    expect(hasJongsung('   ')).toBe(false);
  });
});

describe('josa — 와/과', () => {
  it('받침 있는 단어 → 과', () => {
    expect(josa('두산', '과', '와')).toBe('과');
    expect(josa('삼성', '과', '와')).toBe('과');
    expect(josa('키움', '과', '와')).toBe('과');
  });

  it('받침 없는 단어 → 와', () => {
    expect(josa('LG', '과', '와')).toBe('와');
    expect(josa('KIA', '과', '와')).toBe('와');
    expect(josa('SSG', '과', '와')).toBe('와');
    expect(josa('롯데', '과', '와')).toBe('와');
    expect(josa('한화', '과', '와')).toBe('와');
    expect(josa('NC', '과', '와')).toBe('와');
    expect(josa('KT', '과', '와')).toBe('와');
  });
});

describe('josa — 이/가', () => {
  it('받침 있는 단어 → 이', () => {
    expect(josa('두산', '이', '가')).toBe('이');
    expect(josa('삼성', '이', '가')).toBe('이');
    expect(josa('키움', '이', '가')).toBe('이');
  });

  it('받침 없는 단어 → 가', () => {
    expect(josa('LG', '이', '가')).toBe('가');
    expect(josa('롯데', '이', '가')).toBe('가');
    expect(josa('한화', '이', '가')).toBe('가');
    expect(josa('KIA', '이', '가')).toBe('가');
  });
});

describe('josa — 은/는 (일반화)', () => {
  it('동일 룰 적용', () => {
    expect(josa('두산', '은', '는')).toBe('은');
    expect(josa('LG', '은', '는')).toBe('는');
  });
});

describe('ro — (으)로', () => {
  it('받침 없음 → 로', () => {
    expect(ro('LG')).toBe('로');
    expect(ro('롯데')).toBe('로');
    expect(ro('KIA')).toBe('로');
  });

  it('일반 받침 (ㄹ 제외) → 으로', () => {
    expect(ro('두산')).toBe('으로');
    expect(ro('삼성')).toBe('으로');
    expect(ro('키움')).toBe('으로');
  });

  it('ㄹ 받침 → 로 (한국어 예외)', () => {
    expect(ro('서울')).toBe('로');
    expect(ro('1')).toBe('로'); // 일
    expect(ro('SFR')).toBe('로'); // 알 ㄹ 받침 예외
  });

  it('세이버메트릭스 약어 — 발음 받침 분기', () => {
    expect(ro('FIP')).toBe('으로');   // 피 ㅍ 받침
    expect(ro('XFIP')).toBe('으로');  // 피 ㅍ 받침
    expect(ro('WOBA')).toBe('로');    // 받침 X
    expect(ro('WAR')).toBe('로');     // 받침 X
    expect(ro('ELO')).toBe('로');     // 받침 X
  });

  it('스코어 표기 마지막 디지트 발음 기준', () => {
    expect(ro('5-3')).toBe('으로');  // 삼 ㅁ
    expect(ro('5-2')).toBe('로');    // 이
    expect(ro('1-0')).toBe('으로');  // 영 ㅇ
    expect(ro('2-1')).toBe('로');    // 일 ㄹ 예외
    expect(ro('3-6')).toBe('으로');  // 육 ㄱ
  });
});
