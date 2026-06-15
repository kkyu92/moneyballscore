/**
 * Breadcrumb unit test — plan #19 Step 4 (cycle 1046).
 *
 * 의도: aria-label="breadcrumb" + 마지막 aria-current="page" + separator + 홈 link
 * 박제 검증. JSON-LD BreadcrumbList structured data 박제도 검증.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "../Breadcrumb";

describe("Breadcrumb", () => {
  it("items 빈 배열 시 null 반환 (render nothing)", () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("aria-label='breadcrumb' nav 박제", () => {
    render(<Breadcrumb items={[{ label: "팀", href: "/teams" }]} />);
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
  });

  it("홈 link 첫 ol li 박제 + href='/' 박제", () => {
    render(<Breadcrumb items={[{ label: "팀", href: "/teams" }]} />);
    const home = screen.getByRole("link", { name: "홈" });
    expect(home).toHaveAttribute("href", "/");
  });

  it("마지막 item 은 link 아닌 aria-current='page' span 박제", () => {
    render(
      <Breadcrumb
        items={[
          { label: "팀", href: "/teams" },
          { label: "LG", href: "/teams/LG" },
        ]}
      />,
    );
    expect(screen.queryByRole("link", { name: "LG" })).toBeNull();
    const current = screen.getByText("LG");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("중간 item 은 href 있으면 link 박제 + aria-current 없음", () => {
    render(
      <Breadcrumb
        items={[
          { label: "팀", href: "/teams" },
          { label: "LG", href: "/teams/LG" },
        ]}
      />,
    );
    const middle = screen.getByRole("link", { name: "팀" });
    expect(middle).toHaveAttribute("href", "/teams");
    expect(middle).not.toHaveAttribute("aria-current");
  });

  it("separator '/' span aria-hidden 박제 (1 item = 1 separator)", () => {
    const { container } = render(<Breadcrumb items={[{ label: "팀" }]} />);
    const separators = container.querySelectorAll('span[aria-hidden="true"]');
    expect(separators.length).toBe(1);
    expect(separators[0]).toHaveTextContent("/");
  });

  it("JSON-LD BreadcrumbList structured data 박제 (홈 + items)", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "팀", href: "/teams" },
          { label: "LG" },
        ]}
      />,
    );
    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    const parsed = JSON.parse(ld!.textContent!);
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(3);
    expect(parsed.itemListElement[0].name).toBe("홈");
    expect(parsed.itemListElement[1].name).toBe("팀");
    expect(parsed.itemListElement[2].name).toBe("LG");
    expect(parsed.itemListElement[2].item).toBeUndefined();
  });

  it("href 없는 중간 item 은 link 아닌 span 박제", () => {
    render(
      <Breadcrumb
        items={[
          { label: "팀" },
          { label: "LG", href: "/teams/LG" },
        ]}
      />,
    );
    expect(screen.queryByRole("link", { name: "팀" })).toBeNull();
    expect(screen.getByText("팀")).toBeInTheDocument();
  });

  it("locale='en' 시 첫 link label 'Home' + href '/en/mlb' 박제", () => {
    render(<Breadcrumb items={[{ label: "MLB Analysis" }]} locale="en" />);
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/en/mlb");
    expect(screen.queryByText("홈")).toBeNull();
  });

  it("locale='en' 시 JSON-LD itemListElement[0].name='Home' + 절대 URL '/en/mlb' 박제", () => {
    const { container } = render(
      <Breadcrumb items={[{ label: "MLB Analysis" }]} locale="en" />,
    );
    const ld = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(ld!.textContent!);
    expect(parsed.itemListElement[0].name).toBe("Home");
    expect(parsed.itemListElement[0].item).toBe(
      "https://moneyballscore.vercel.app/en/mlb",
    );
  });
});
