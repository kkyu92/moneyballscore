export function PlaceholderLoginButton() {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled
        aria-describedby="login-eta-hint"
        className="px-3 py-1.5 rounded-md bg-brand-100 dark:bg-brand-900 text-brand-400 text-xs cursor-not-allowed opacity-60"
      >
        로그인
      </button>
      <p id="login-eta-hint" className="text-[10px] text-brand-500 dark:text-brand-400">
        📌 박제 중 (ETA 2026-08~09)
      </p>
    </div>
  );
}
