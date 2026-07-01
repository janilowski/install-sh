import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { installerScript } from "../lib/script.js";

test("bootstrap downloads the release installer and forwards args", () => {
  const script = installerScript("https://example.test/install-linux-release");

  assert.match(script, /^#!\/bin\/sh/);
  assert.match(script, /set -eu/);
  assert.match(script, /Linux:x86_64\|Linux:amd64/);
  assert.match(script, /Darwin:arm64\|Darwin:x86_64/);
  assert.match(script, /curl --proto '=https' --tlsv1\.2 -fsSL/);
  assert.match(script, /wget -O "\$dest" "\$url"/);
  assert.match(script, /curl or wget is required to install nteract/);
  assert.doesNotMatch(script, /curl is required to install nteract/);
  assert.match(script, /https:\/\/example\.test\/install-linux-release/);
  assert.match(script, /exec "\$tmp\/install-linux-release" "\$@"/);
});

test("bootstrap can fetch with wget when curl is unavailable", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "nteract-install-sh-"));
  t.after(() => rmSync(dir, { force: true, recursive: true }));

  const binDir = join(dir, "bin");
  const scriptPath = join(dir, "install.sh");
  const downloadedLog = join(dir, "downloaded.log");
  const execLog = join(dir, "exec.log");
  const fakeInstaller = join(dir, "fake-install-linux-release");

  mkdirSync(binDir);

  const linkCommand = (name) => {
    for (const candidate of [`/bin/${name}`, `/usr/bin/${name}`]) {
      if (existsSync(candidate)) {
        symlinkSync(candidate, join(binDir, name));
        return;
      }
    }
    throw new Error(`missing test command: ${name}`);
  };

  writeFileSync(scriptPath, installerScript("https://example.test/install-linux-release"));
  chmodSync(scriptPath, 0o755);

  writeFileSync(
    fakeInstaller,
    `#!/bin/sh\necho "fake installer $*" > "${execLog}"\n`,
  );
  chmodSync(fakeInstaller, 0o755);

  writeFileSync(
    join(dir, "uname"),
    `#!/bin/sh\ncase "\${1:-}" in\n  -s) echo Linux ;;\n  -m) echo x86_64 ;;\n  *) echo Linux ;;\nesac\n`,
  );
  chmodSync(join(dir, "uname"), 0o755);

  writeFileSync(
    join(dir, "wget"),
    `#!/bin/sh\nset -eu\nout=""\nurl=""\nwhile [ "$#" -gt 0 ]; do\n  case "$1" in\n    -O) out="$2"; shift 2 ;;\n    *) url="$1"; shift ;;\n  esac\ndone\necho "$url" >> "${downloadedLog}"\ncat "${fakeInstaller}" > "$out"\n`,
  );
  chmodSync(join(dir, "wget"), 0o755);

  for (const command of ["chmod", "cat", "mktemp", "rm"]) {
    linkCommand(command);
  }
  symlinkSync(join(dir, "uname"), join(binDir, "uname"));
  symlinkSync(join(dir, "wget"), join(binDir, "wget"));

  const result = spawnSync("/bin/sh", [scriptPath, "--headless"], {
    env: { HOME: dir, PATH: binDir },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(
    readFileSync(downloadedLog, "utf8").trim(),
    "https://example.test/install-linux-release",
  );
  assert.equal(readFileSync(execLog, "utf8").trim(), "fake installer --headless");
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
