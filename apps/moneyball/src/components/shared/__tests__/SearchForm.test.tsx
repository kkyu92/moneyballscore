import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { SearchForm } from "../SearchForm";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/"),
}));

const mockedUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockedUsePathname.mockReturnValue("/");
});

describe("SearchForm", () => {
  it("KO pathname — KO aria-label/placeholder/버튼 텍스트 (변경 없음)", () => {
    mockedUsePathname.mockReturnValue("/");
    render(<SearchForm compact />);

    expect(screen.getByRole("search")).toHaveAttribute("aria-label", "사이트 검색");
    expect(screen.getByPlaceholderText("팀, 선수, 일자 검색…")).toBeTruthy();
    expect(screen.getByLabelText("검색어")).toBeTruthy();
    expect(screen.getByRole("button", { name: "검색" })).toBeTruthy();
  });

  it("EN pathname(/en/mlb/*) — EN aria-label/placeholder/버튼 텍스트 (SearchForm i18n 누락 fix)", () => {
    mockedUsePathname.mockReturnValue("/en/mlb/team/NYY");
    render(<SearchForm compact />);

    expect(screen.getByRole("search")).toHaveAttribute("aria-label", "Site search");
    expect(screen.getByPlaceholderText("Search teams, players, dates…")).toBeTruthy();
    expect(screen.getByLabelText("Search query")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
    expect(screen.queryByText("검색")).toBeNull();
  });
});
