// Showreel captions (WCAG 1.2.2): a caption track is rendered only once a real
// .vtt file is configured; the template is valid WebVTT.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("showreel captions", () => {
  it("renders the English caption track only when SHOWREEL_CAPTIONS_SRC is set", () => {
    const src = read("app/components/homepage/video-section.tsx");
    assert.match(src, /export const SHOWREEL_CAPTIONS_SRC: string \| null = /);
    assert.match(
      src,
      /\{SHOWREEL_CAPTIONS_SRC \? \(\s*<track kind="captions" src=\{SHOWREEL_CAPTIONS_SRC\} srcLang="en" label="English" default \/>\s*\) : null\}/
    );
  });

  it("ships a WebVTT template for the owner to fill in", () => {
    const vtt = read("docs/showreel-captions-template.vtt").replace(/\r\n/g, "\n");
    assert.ok(vtt.startsWith("WEBVTT\n"));
    assert.match(vtt, /^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}$/m);
  });
});
