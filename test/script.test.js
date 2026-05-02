import assert from "node:assert/strict";
import { test } from "node:test";

import { installerScript } from "../lib/script.js";

test("bootstrap downloads the release installer and forwards args", () => {
  const script = installerScript("https://example.test/install-linux-release");

  assert.match(script, /^#!\/bin\/sh/);
  assert.match(script, /set -eu/);
  assert.match(script, /Linux:x86_64\|Linux:amd64/);
  assert.match(script, /curl --proto '=https' --tlsv1\.2 -fsSL/);
  assert.match(script, /https:\/\/example\.test\/install-linux-release/);
  assert.match(script, /exec "\$tmp\/install-linux-release" "\$@"/);
});

test("bootstrap does not install agent integrations", () => {
  const script = installerScript();

  assert.doesNotMatch(script, /npm:@nteract\/pi/);
  assert.doesNotMatch(script, /\bpi install\b/);
  assert.doesNotMatch(script, /claude|cursor|windsurf/i);
});
