const DEFAULT_INSTALLER_URL =
  "https://raw.githubusercontent.com/nteract/desktop/main/scripts/install-linux-release";

export function installerScript(installerUrl = DEFAULT_INSTALLER_URL) {
  return `#!/bin/sh
set -eu

case "$(uname -s):$(uname -m)" in
  Linux:x86_64|Linux:amd64)
    ;;
  *)
    echo "nteract installer currently supports Linux x64 only." >&2
    exit 1
    ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to install nteract." >&2
  exit 1
fi

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT INT TERM

curl --proto '=https' --tlsv1.2 -fsSL \\
  "${installerUrl}" \\
  -o "$tmp/install-linux-release"

chmod 0755 "$tmp/install-linux-release"
exec "$tmp/install-linux-release" "$@"
`;
}
