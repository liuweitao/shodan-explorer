#!/bin/sh
set -eu

api_key="${SHODAN_API_KEY:-shodanproxy}"
base_url="${SHODAN_BASE_URL:-http://shodan-proxy:8080}"

# Both current gateway keys and Shodan keys are alphanumeric. Restricting the
# accepted alphabet prevents runtime JSON or nginx-template injection.
case "$api_key" in
  ''|*[!A-Za-z0-9_-]*)
    echo "SHODAN_API_KEY contains unsupported characters" >&2
    exit 1
    ;;
esac

if [ "${#api_key}" -gt 256 ]; then
  echo "SHODAN_API_KEY is too long" >&2
  exit 1
fi

case "$base_url" in
  http://*|https://*) ;;
  *)
    echo "SHODAN_BASE_URL must use http:// or https://" >&2
    exit 1
    ;;
esac

case "$base_url" in
  *[!A-Za-z0-9.:/_-]*)
    echo "SHODAN_BASE_URL contains unsupported characters" >&2
    exit 1
    ;;
esac

base_authority="${base_url#*://}"
case "$base_authority" in
  ''|*/*)
    echo "SHODAN_BASE_URL must be an origin without a path or trailing slash" >&2
    exit 1
    ;;
esac

export SHODAN_BASE_URL="$base_url"
mkdir -p /tmp/client-body /tmp/nginx-conf.d /tmp/proxy
printf '{"shodanApiKey":"%s"}\n' "$api_key" > /tmp/runtime-config.json
chmod 0444 /tmp/runtime-config.json
