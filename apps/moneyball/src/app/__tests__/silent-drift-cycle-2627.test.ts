import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 2627 polish-ui: live browser audit (1280x720 + 375x812) found the
// Ko-fi floating donate widget (KofiWidget.tsx, z-index 99999999, default
// bottom-left position) visually overlapping the CookieConsent banner and
// the accuracy stat cards above it while the cookie banner is showing —
// confirmed reproducible before dismiss on both viewports via screenshot.
// Fix: hide the widget entirely while body[data-cookie-shown="true"] (the
// same toggle CookieConsent.tsx already uses for footer spacer padding),
// so it never collides with the banner or the content behind it. The
// widget reappears immediately once the banner is dismissed.
const GLOBALS_CSS = readFileSync(
  join(__dirname, "../globals.css"),
  "utf-8",
);

describe("silent-drift cycle 2627: Ko-fi widget vs cookie banner overlap", () => {
  it("hides the Ko-fi floating widget while the cookie banner is shown", () => {
    const rulePattern =
      /body\[data-cookie-shown="true"\]\s*\.floatingchat-container-wrap,\s*body\[data-cookie-shown="true"\]\s*\.floatingchat-container-wrap-mobi\s*\{\s*display:\s*none\s*!important;\s*\}/;
    expect(GLOBALS_CSS).toMatch(rulePattern);
  });

  it("CookieConsent still owns the body[data-cookie-shown] toggle the hide rule depends on", () => {
    const cookieConsent = readFileSync(
      join(
        __dirname,
        "../../components/layout/CookieConsent.tsx",
      ),
      "utf-8",
    );
    expect(cookieConsent).toContain('document.body.dataset.cookieShown = \'true\'');
  });
});
