import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 text-center">
      <h1 className="text-5xl font-bold text-brand-500/40">404</h1>
      <p className="text-brand-700 dark:text-brand-100 mt-4">잘못된 날짜 형식</p>
      <p className="text-sm text-brand-500 mt-2">URL 형식: <code>/mlb/games/YYYY-MM-DD</code></p>
      <Link href="/mlb" className="inline-block mt-6 text-brand-600 hover:underline">MLB hub →</Link>
    </main>
  );
}
