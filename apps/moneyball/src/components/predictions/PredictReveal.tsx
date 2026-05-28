"use client";

/**
 * PredictReveal — 승률 카운트업 reveal 애니메이션.
 *
 * - mount 시 0 → target prob (200ms ease-out, --motion-medium 토큰 정렬).
 * - prefers-reduced-motion: reduce → 즉시 표시 (가드).
 * - aria-live=polite + aria-label = 최종 값 (스크린 리더는 중간 progress 무시).
 * - 색상 토큰은 부모에서 상속 (text-brand-* / text-white 자유) — 자체 색 X.
 */

import { useEffect, useState } from "react";

type Props = {
  /** target probability, 0-1 */
  prob: number;
  /** override duration ms (default 200) */
  durationMs?: number;
  /** wrapper className (color/font/size 은 부모가 결정) */
  className?: string;
  /** SR label (optional, prefix to "{N}%") */
  label?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

export function PredictReveal({
  prob,
  durationMs = 200,
  className,
  label,
}: Props) {
  const target = Math.max(0, Math.min(1, prob));
  // SSR-safe lazy init: window undefined → reduced=true → 즉시 target 표시 (SSR/CSR 동일).
  const [reduced] = useState<boolean>(() => prefersReducedMotion());
  const [display, setDisplay] = useState<number>(target);

  useEffect(() => {
    if (reduced) {
      // target prop 변경 시 즉시 동기화 (lazy init 은 mount 1회만)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal 애니메이션 의도된 setState (props sync)
      setDisplay(target);
      return;
    }

    // Animate from 0 to target via RAF — DOM mutation 패턴 대신 React state 로 progress 표현.
    setDisplay(0);

    let raf = 0;
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out: 1 - (1-t)^2
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(target * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, durationMs, reduced]);

  const pct = Math.round(display * 100);
  const finalPct = Math.round(target * 100);

  return (
    <span
      className={className}
      role="status"
      aria-live="polite"
      aria-label={label ? `${label} ${finalPct}%` : `${finalPct}%`}
      data-target={target}
      data-reduced={reduced ? "true" : "false"}
    >
      {pct}%
    </span>
  );
}
