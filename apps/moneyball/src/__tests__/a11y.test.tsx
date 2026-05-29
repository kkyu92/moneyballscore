/**
 * a11y test — plan #19 Step 4 (cycle 1046).
 *
 * Footer + Breadcrumb axe-core a11y violation 0 검증.
 * MegaMenu a11y 는 별도 컴포넌트 a11y test 파일에 박제 — 본 파일 = 통합 sweep.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Footer } from "../components/layout/Footer";
import { Breadcrumb } from "../components/shared/Breadcrumb";

describe("a11y axe-core sweep", () => {
  it("Footer violation 0", async () => {
    const { container } = render(<Footer />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("Breadcrumb (single item) violation 0", async () => {
    const { container } = render(<Breadcrumb items={[{ label: "팀" }]} />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("Breadcrumb (multi item with href) violation 0", async () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "팀", href: "/teams" },
          { label: "LG", href: "/teams/LG" },
          { label: "선수" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
