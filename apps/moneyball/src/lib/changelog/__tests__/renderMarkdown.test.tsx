import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { tokenize, renderChangelogBody } from "../renderMarkdown";

describe("tokenize — block 분류", () => {
  it("빈 문자열 → 빈 블록", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("--- → hr block", () => {
    const blocks = tokenize("---");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("hr");
  });

  it("### → h3 block", () => {
    const blocks = tokenize("### 섹션 제목");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("h3");
    expect(blocks[0].lines).toEqual(["섹션 제목"]);
  });

  it("- bullet → ul block", () => {
    const blocks = tokenize("- 첫 항목\n- 둘째 항목");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("ul");
    expect(blocks[0].items).toEqual([
      { text: "첫 항목", depth: 0 },
      { text: "둘째 항목", depth: 0 },
    ]);
  });

  it("들여쓰기 bullet → depth 계산 (2칸 = depth 1)", () => {
    const blocks = tokenize("- 상위\n  - 하위\n    - 더 하위");
    expect(blocks[0].items).toEqual([
      { text: "상위", depth: 0 },
      { text: "하위", depth: 1 },
      { text: "더 하위", depth: 2 },
    ]);
  });

  it("paragraph 텍스트 → p block", () => {
    const blocks = tokenize("일반 문단입니다");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("p");
    expect(blocks[0].lines).toEqual(["일반 문단입니다"]);
  });

  it("blank 라인 → flush 트리거 (p + p 분리)", () => {
    const blocks = tokenize("문단1\n\n문단2");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind).toBe("p");
    expect(blocks[1].kind).toBe("p");
  });

  it("ul + h3 + ul 시 ul flush 분리", () => {
    const blocks = tokenize("- 항목1\n### 제목\n- 항목2");
    expect(blocks).toHaveLength(3);
    expect(blocks[0].kind).toBe("ul");
    expect(blocks[1].kind).toBe("h3");
    expect(blocks[2].kind).toBe("ul");
  });

  it("hr 이 paragraph + ul flush", () => {
    const blocks = tokenize("문단\n- 항목\n---\n다른 문단");
    expect(blocks.map((b) => b.kind)).toEqual(["p", "ul", "hr", "p"]);
  });
});

describe("renderChangelogBody — inline 마크업 렌더", () => {
  it("**bold** → <strong>", () => {
    const { container } = render(renderChangelogBody("이것은 **굵게** 입니다"));
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("굵게");
  });

  it("`code` → <code>", () => {
    const { container } = render(renderChangelogBody("`pnpm test` 실행"));
    const code = container.querySelector("code");
    expect(code?.textContent).toBe("pnpm test");
  });

  it("*italic* → <em> (single asterisk)", () => {
    const { container } = render(renderChangelogBody("이건 *기울임* 입니다"));
    const em = container.querySelector("em");
    expect(em?.textContent).toBe("기울임");
  });

  it("[label](url) → <a> with href", () => {
    const { container } = render(
      renderChangelogBody("[GitHub](https://github.com/x/y) 링크"),
    );
    const a = container.querySelector("a");
    expect(a?.textContent).toBe("GitHub");
    expect(a?.getAttribute("href")).toBe("https://github.com/x/y");
  });

  it("외부 링크 (http://) → target=_blank + rel", () => {
    const { container } = render(
      renderChangelogBody("[ext](https://example.com)"),
    );
    const a = container.querySelector("a");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("내부 링크 (/path) → target 부재", () => {
    const { container } = render(
      renderChangelogBody("[내부](/changelog)"),
    );
    const a = container.querySelector("a");
    expect(a?.getAttribute("target")).toBeNull();
  });
});

describe("renderChangelogBody — block 렌더", () => {
  it("h3 → <h3>", () => {
    const { container } = render(renderChangelogBody("### 부제목"));
    expect(container.querySelector("h3")?.textContent).toBe("부제목");
  });

  it("--- → <hr>", () => {
    const { container } = render(renderChangelogBody("---"));
    expect(container.querySelector("hr")).not.toBeNull();
  });

  it("- bullet → <ul><li>", () => {
    const { container } = render(renderChangelogBody("- 항목1\n- 항목2"));
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe("항목1");
  });

  it("depth > 0 bullet → marginLeft 인라인 스타일", () => {
    const { container } = render(
      renderChangelogBody("- 상위\n  - 하위"),
    );
    const items = container.querySelectorAll("li");
    const childStyle = (items[1] as HTMLElement).style.marginLeft;
    expect(childStyle).toBe("12px");
  });

  it("paragraph → <p>", () => {
    const { container } = render(renderChangelogBody("일반 문단"));
    expect(container.querySelector("p")?.textContent).toBe("일반 문단");
  });
});
