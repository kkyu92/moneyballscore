"use client";

import { useState } from "react";
import type { LottoSet } from "@/lib/lotto/picks-loader";

type Separator = "comma" | "space";

export function CopyAllButton({ sets, className }: { sets: LottoSet[]; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [sep, setSep] = useState<Separator>("comma");

  async function handleCopy() {
    const joiner = sep === "comma" ? "," : " ";
    const text = sets
      .map((s) => s.numbers.map((n: number) => n.toString().padStart(2, "0")).join(joiner))
      .join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const label = status === "copied" ? `✅ ${sets.length}조합 복사 완료` : status === "error" ? "❌ 복사 실패" : `📋 전체 ${sets.length}조합 복사`;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50"
        aria-label={`추천 ${sets.length}조합 전체 복사`}
      >
        {label}
      </button>
      <div className="inline-flex text-xs rounded-lg border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
        <button
          type="button"
          onClick={() => setSep("comma")}
          className={`px-3 py-1.5 ${sep === "comma" ? "bg-gray-100 dark:bg-gray-800 font-semibold" : "text-gray-500"}`}
          aria-pressed={sep === "comma"}
        >
          콤마
        </button>
        <button
          type="button"
          onClick={() => setSep("space")}
          className={`px-3 py-1.5 ${sep === "space" ? "bg-gray-100 dark:bg-gray-800 font-semibold" : "text-gray-500"}`}
          aria-pressed={sep === "space"}
        >
          스페이스
        </button>
      </div>
    </div>
  );
}
