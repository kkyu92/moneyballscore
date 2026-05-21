"use client";

import { useState } from "react";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  const emailValid = email.length >= 5 && email.length <= 254 && EMAIL_REGEX.test(email);
  const submitting = state.kind === "submitting";
  const done = state.kind === "success";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailValid || submitting || done) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState({ kind: "error", message: "네트워크 연결 확인 후 다시 시도해주세요." });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const res = await fetch("/api/mlb/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, _hp: hp, league: "mlb" }),
      });

      if (res.status === 429) {
        setState({
          kind: "error",
          message: "잠시 후 다시 시도해주세요 (5분 후 가능).",
        });
        return;
      }
      if (res.status === 403) {
        setState({ kind: "error", message: "잘못된 요청입니다." });
        return;
      }
      if (res.ok) {
        setState({ kind: "success" });
        return;
      }

      setState({ kind: "error", message: "잠시 후 다시 시도해주세요." });
    } catch {
      setState({ kind: "error", message: "잠시 후 다시 시도해주세요." });
    }
  }

  if (done) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg bg-brand-100 dark:bg-brand-900/60 border border-brand-300 dark:border-brand-700 p-4 text-sm text-brand-700 dark:text-brand-100 leading-relaxed"
      >
        가입 완료. 출시 시 알림 받게 됩니다.
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit} aria-describedby="waitlist-status">
      <label className="block">
        <span className="text-xs text-brand-500 dark:text-brand-400 uppercase tracking-wide font-medium">
          이메일
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="example@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          required
          className="mt-1 w-full rounded-lg border border-brand-200 dark:border-brand-800 bg-white dark:bg-brand-950 px-4 py-2.5 text-sm text-brand-700 dark:text-brand-100 placeholder:text-brand-400 dark:placeholder:text-brand-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </label>

      <input
        type="text"
        name="_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="hidden"
      />

      <button
        type="submit"
        disabled={!emailValid || submitting}
        className="w-full rounded-lg bg-brand-500 text-white font-medium py-2.5 px-4 text-sm shadow-sm hover:bg-brand-600 transition-colors disabled:bg-brand-300 dark:disabled:bg-brand-800 disabled:cursor-not-allowed"
      >
        {submitting ? "가입 중..." : "출시 알림 받기"}
      </button>

      <p
        id="waitlist-status"
        className="text-xs text-brand-500 dark:text-brand-400 leading-relaxed min-h-[1em]"
        role={state.kind === "error" ? "alert" : undefined}
        aria-live={state.kind === "error" ? "polite" : undefined}
      >
        {state.kind === "error"
          ? state.message
          : !email
            ? "유효한 이메일 형식 (example@domain.com)"
            : emailValid
              ? "가입 준비 완료"
              : "유효한 이메일 형식을 입력해주세요"}
      </p>
    </form>
  );
}
