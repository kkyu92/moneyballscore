import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// cookie-free anon client — RLS 통과하는 public 데이터만 읽음 (회원 기능 미구현,
// app/login 은 placeholder). 과거 `@supabase/ssr` + `cookies()` 조합은 Next.js 가
// 호출부 44개 route 전체를 dynamic 으로 강제해 `export const revalidate` 를 무력화시킴
// (app/sitemap.ts 가 이미 2026-XX 에 동일 원인으로 전용 cookie-free client 로 우회한 전례,
// 본 fix 는 그 우회를 공유 헬퍼 레벨로 끌어올려 44개 호출부 전체에 일괄 적용).
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
