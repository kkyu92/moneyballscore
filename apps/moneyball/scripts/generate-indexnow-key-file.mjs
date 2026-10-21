#!/usr/bin/env node
// IndexNow ownership 검증 파일을 build-time 에 public/ 에 실제 static 파일로 생성.
//
// 과거 시도 (cycle 3241) 는 `[indexnowKey].txt` App Router dynamic route 로
// 처리했으나 — generateStaticParams+dynamicParams:false (static) 든 plain
// dynamic(ƒ) 이든 둘 다 Vercel 이 "폴더명에 리터럴 확장자(.txt) 가 붙은 dynamic
// segment" 를 edge 라우팅 manifest 에 제대로 등록하지 못해 모든 요청이
// 플랫폼 레벨 `/_not-found` 로 떨어짐 (x-matched-path 로 실측 확인, cycle 3483
// 재진단 — route 자체는 제거하고 이 스크립트로 대체).
//
// public/ 의 literal 파일은 Next.js dynamic routing 을 전혀 거치지 않고 정적
// 에셋으로 서빙되므로 위 Vercel 라우팅 제약을 구조적으로 회피한다.
import { writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const key = process.env.INDEXNOW_KEY?.trim();

// 이전 빌드가 생성한 stale key 파일 정리 (key 로테이션 대비).
for (const file of readdirSync(PUBLIC_DIR)) {
  if (file.endsWith('.txt')) {
    unlinkSync(join(PUBLIC_DIR, file));
  }
}

if (!key) {
  console.warn('[generate-indexnow-key-file] INDEXNOW_KEY env 미설정 — key 파일 생성 skip');
  process.exit(0);
}

writeFileSync(join(PUBLIC_DIR, `${key}.txt`), key, 'utf-8');
console.log(`[generate-indexnow-key-file] public/${key}.txt 생성 완료`);
