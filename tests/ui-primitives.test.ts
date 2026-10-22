// Static checks for the shared UI primitives added in the UI cleanup (Step 2).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

function cssVar(css: string, name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(match, `--${name} is defined`);
  return match[1].trim();
}

describe("design tokens", () => {
  const css = read("app/globals.css");

  it("accent is not the destructive red", () => {
    assert.notEqual(cssVar(css, "accent"), cssVar(css, "destructive"));
  });

  it("primary and ring use the PESO navy", () => {
    assert.equal(cssVar(css, "primary"), "225 45% 30%");
    assert.equal(cssVar(css, "ring"), "225 45% 30%");
  });

  it("defines status tokens and exposes them to Tailwind", () => {
    const tailwind = read("tailwind.config.ts");
    for (const name of ["success", "warning", "info"]) {
      cssVar(css, name);
      cssVar(css, `${name}-foreground`);
      assert.match(tailwind, new RegExp(`hsl\\(var\\(--${name}\\)\\)`));
    }
  });

  it("form-field border token is not the near-white decorative border", () => {
    assert.equal(cssVar(css, "input"), "215 16% 56%");
    for (const file of ["input", "select", "textarea"]) {
      assert.match(read(`app/components/ui/${file}.tsx`), /border border-input/, file);
    }
  });

  it("loads only the font weights in use", () => {
    assert.match(css, /satoshi@400,500,700&/);
  });
});

describe("dialogs", () => {
  it("alert dialog content is a modal alertdialog that ignores outside clicks", () => {
    const src = read("app/components/ui/alert-dialog.tsx");
    assert.match(src, /role="alertdialog"/);
    assert.match(src, /aria-modal="true"/);
    assert.match(src, /onInteractOutside[\s\S]*?event\.preventDefault\(\)/);
  });

  it("dialog overlay has no backdrop blur", () => {
    assert.doesNotMatch(read("app/components/ui/dialog.tsx"), /backdrop-blur/);
  });

  it("confirm dialog exports useConfirm and its provider", () => {
    const src = read("app/components/ui/confirm-dialog.tsx");
    assert.match(src, /export function useConfirm\(/);
    assert.match(src, /export function ConfirmDialogProvider\(/);
  });

  it("confirm dialog returns focus to the opener and cancels on navigation", () => {
    const src = read("app/components/ui/confirm-dialog.tsx");
    assert.match(src, /onCloseAutoFocus=/);
    assert.match(src, /target\?\.isConnected\) target\.focus\(\)/);
    assert.match(src, /usePathname\(\)/);
    assert.match(src, /key=\{requestId\}/);
  });

  it("providers mount ConfirmDialogProvider", () => {
    assert.match(read("app/components/providers.tsx"), /<ConfirmDialogProvider>/);
  });
});

describe("loading states", () => {
  it("button supports a loading state", () => {
    const src = read("app/components/ui/button.tsx");
    assert.match(src, /loading\?: boolean/);
    assert.match(src, /aria-busy=/);
    assert.match(src, /aria-disabled=\{loading/);
    assert.match(src, /motion-reduce:animate-none/);
    // Loading must not set the native disabled attribute (it drops keyboard focus).
    assert.doesNotMatch(src, /(?<!-)disabled=\{loading/);
  });

  it("destructive hovers keep white text readable", () => {
    assert.doesNotMatch(read("app/components/ui/button.tsx"), /hover:bg-destructive\//);
    assert.doesNotMatch(read("app/components/ui/badge.tsx"), /hover:bg-destructive\//);
  });

  it("skeleton blocks are hidden from assistive tech and respect reduced motion", () => {
    const src = read("app/components/ui/skeleton.tsx");
    assert.match(src, /aria-hidden="true"/);
    assert.match(src, /motion-reduce:animate-none/);
  });

  it("layout skeletons announce loading once", () => {
    const src = read("app/components/ui/skeletons.tsx");
    assert.match(src, /role="status"/);
    assert.doesNotMatch(src, /aria-busy="true"/);
    assert.match(src, /sr-only">Loading…</);
  });
});
