import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PredictReveal } from "@/components/predictions/PredictReveal";

/**
 * matchMedia mock helper.
 * - jsdom 은 matchMedia 미구현 → window.matchMedia 직접 stub.
 */
function mockMatchMedia(reducedMotion: boolean) {
  const listeners = new Set<EventListener>();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduce") ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: EventListener) => listeners.add(cb),
      removeEventListener: (_: string, cb: EventListener) =>
        listeners.delete(cb),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("PredictReveal", () => {
  beforeEach(() => {
    // default = normal motion
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normal motion — 0 부터 시작해서 target prob 으로 카운트업", async () => {
    mockMatchMedia(false);

    const { container } = render(<PredictReveal prob={0.62} label="LG 승률" />);

    const span = container.querySelector('[role="status"]') as HTMLElement;
    expect(span).toBeTruthy();
    expect(span).toHaveAttribute("data-reduced", "false");
    expect(span).toHaveAttribute("data-target", "0.62");

    // 최종 값까지 도달 (RAF 자연 진행)
    await waitFor(
      () => {
        expect(span.textContent).toBe("62%");
      },
      { timeout: 1000 },
    );

    // aria-label = 최종 값 (중간 progress 무시)
    expect(span).toHaveAttribute("aria-label", "LG 승률 62%");
  });

  it("reduced motion — 즉시 target 표시 (애니메이션 X)", async () => {
    mockMatchMedia(true);

    render(<PredictReveal prob={0.55} label="LG 승률" />);

    // useEffect 가 sync 직후 fire — flushSync 보장 위해 act 으로 wrap
    await act(async () => {
      await Promise.resolve();
    });

    const span = screen.getByRole("status");
    expect(span).toHaveAttribute("data-reduced", "true");
    expect(span).toHaveAttribute("data-target", "0.55");
    // 카운트업 없이 즉시 55%
    expect(span.textContent).toBe("55%");
    expect(span).toHaveAttribute("aria-label", "LG 승률 55%");
  });

  it("globals.css 안 motion 토큰 + reduced-motion 가드 박제", () => {
    const cssPath = path.resolve(
      __dirname,
      "../../app/globals.css",
    );
    const css = readFileSync(cssPath, "utf-8");

    // @theme 안 motion 토큰
    expect(css).toMatch(/--motion-fast:\s*150ms/);
    expect(css).toMatch(/--motion-medium:\s*200ms/);
    expect(css).toMatch(/--motion-slow:\s*300ms/);
    expect(css).toMatch(/--ease-out:\s*cubic-bezier/);

    // reduced-motion 가드 — 0ms 강제
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/--motion-fast:\s*0ms/);
    expect(css).toMatch(/--motion-medium:\s*0ms/);
    expect(css).toMatch(/--motion-slow:\s*0ms/);
  });

  it("Contrast — 다크 모드 컨테이너 안 PredictReveal 가 DESIGN.md 검증된 토큰만 사용 (자체 색 X)", () => {
    mockMatchMedia(true); // 빠른 finalize

    const { container } = render(
      <div className="dark" data-testid="dark-wrapper">
        <div className="bg-surface-card text-brand-100 p-4">
          <PredictReveal
            prob={0.7}
            label="LG 승률"
            className="text-4xl font-bold"
          />
        </div>
      </div>,
    );

    const span = container.querySelector('[role="status"]') as HTMLElement;
    // 컴포넌트 자체 색 토큰 X (className 부모 상속)
    expect(span.className).not.toMatch(/text-(red|emerald|green|blue|gray)-\d+/);
    // 부모가 text-brand-100 (다크 body 12.8:1 WCAG AAA, DESIGN.md Contrast 표) 적용
    const parent = span.parentElement as HTMLElement;
    expect(parent.className).toContain("text-brand-100");
    expect(parent.className).toContain("bg-surface-card");

    // DESIGN.md 안 Contrast 표 존재 확인 (regression guard)
    const designPath = path.resolve(__dirname, "../../../../../DESIGN.md");
    const design = readFileSync(designPath, "utf-8");
    expect(design).toMatch(/## Contrast \(WCAG\)/);
    expect(design).toMatch(/Dark body.*brand-100.*surface.*12\.8:1.*AAA/);
  });
});
