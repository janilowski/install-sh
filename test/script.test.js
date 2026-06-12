import assert from "node:assert/strict";
import { test } from "node:test";

import { installerScript } from "../lib/script.js";

test("bootstrap downloads the release installer and forwards args", () => {
  const script = installerScript("https://example.test/install-linux-release");

  assert.match(script, /^#!\/bin\/sh/);
  assert.match(script, /set -eu/);
  assert.match(script, /Linux:x86_64\|Linux:amd64/);
  assert.match(script, /Darwin:arm64\|Darwin:x86_64/);
  assert.match(script, /curl --proto '=https' --tlsv1\.2 -fsSL/);
  assert.match(script, /https:\/\/example\.test\/install-linux-release/);
  assert.match(script, /exec "\$tmp\/install-linux-release" "\$@"/);
});

test("darwin falls back to main's script when the release copy predates macOS support", () => {
  const script = installerScript("https://example.test/install-linux-release");

  // The bridge probes the downloaded script for the Darwin gate and re-fetches
  // from main when absent, so sh.nteract.io works on macOS before the first
  // release that ships the darwin-aware installer.
  assert.match(script, /grep -q "Darwin:arm64" "\$tmp\/install-linux-release"/);
  assert.match(
    script,
    /https:\/\/raw\.githubusercontent\.com\/nteract\/nteract\/main\/scripts\/install-linux-release/,
  );
});

test("unsupported platforms get guidance, not a bare failure", () => {
  const script = installerScript("https://example.test/install-linux-release");

  assert.match(script, /Linux x64 and macOS \(Apple silicon, Intel\)/);
  assert.match(script, /github\.com\/nteract\/nteract\/releases/);
});

test("bootstrap does not install agent integrations", () => {
  const script = installerScript();

  assert.doesNotMatch(script, /npm:@nteract\/pi/);
  assert.doesNotMatch(script, /\bpi install\b/);
  assert.doesNotMatch(script, /claude|cursor|windsurf/i);
});
