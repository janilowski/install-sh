const FALLBACK_INSTALLER_URL =
  "https://raw.githubusercontent.com/nteract/desktop/main/scripts/install-linux-release";

/**
 * Fetch the latest stable release's install-linux-release asset URL.
 * Returns fallback URL on error.
 */
export async function getLatestStableInstallerUrl() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/nteract/desktop/releases/latest",
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    );
    if (!res.ok) return FALLBACK_INSTALLER_URL;

    const release = await res.json();
    const asset = release.assets?.find((a) => a.name === "install-linux-release");
    return asset?.browser_download_url || FALLBACK_INSTALLER_URL;
  } catch {
    return FALLBACK_INSTALLER_URL;
  }
}

export function installerScript(installerUrl) {
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
