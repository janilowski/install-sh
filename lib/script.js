const FALLBACK_INSTALLER_URL =
  "https://raw.githubusercontent.com/nteract/nteract/main/scripts/install-linux-release";

/**
 * Fetch the latest stable release's install-linux-release asset URL.
 * Returns fallback URL on error.
 */
export async function getLatestStableInstallerUrl() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/nteract/nteract/releases/latest",
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
    os="linux"
    ;;
  Darwin:arm64|Darwin:x86_64)
    os="darwin"
    ;;
  *)
    echo "nteract installer supports Linux x64 and macOS (Apple silicon, Intel)." >&2
    echo "Windows users: download the installer from https://github.com/nteract/nteract/releases" >&2
    exit 1
    ;;
esac

download_url() {
  url="$1"
  dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl --proto '=https' --tlsv1.2 -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$dest" "$url"
  else
    echo "curl or wget is required to install nteract." >&2
    exit 1
  fi
}

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT INT TERM

download_url "${installerUrl}" "$tmp/install-linux-release"

# Self-healing bridge: release-pinned installers older than macOS support
# only know Linux. Until the first release that ships the darwin-aware
# script, fall back to the script on main for Darwin hosts. Delete this
# block once the latest stable release carries Darwin support.
if [ "$os" = "darwin" ] && ! grep -q "Darwin:arm64" "$tmp/install-linux-release"; then
  download_url "${FALLBACK_INSTALLER_URL}" "$tmp/install-linux-release"
fi

chmod 0755 "$tmp/install-linux-release"
exec "$tmp/install-linux-release" "$@"
`;
}
