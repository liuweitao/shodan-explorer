# Security Policy

## Supported versions

Security fixes are applied to the latest v2 release. The v1 frontend and its Node 14
toolchain are no longer supported.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or leaked credential. Send
the report to [me@liuweitao.cn](mailto:me@liuweitao.cn) with:

- the affected version and deployment mode;
- reproduction steps or a minimal proof of concept;
- expected impact; and
- any suggested mitigation.

Remove all real Shodan keys, proxy configuration, passwords, tokens, IP addresses,
and sensitive API responses from the report unless they are essential and sent over
an agreed secure channel.

## Deployment boundary

Shodan Explorer deliberately retains Shodan's standard `base_url + key` request
shape. Consequently, the configured key is available to the browser. The default
`shodanproxy` value is a disposable compatibility marker for the bundled proxy, not
a real Shodan key and not a secret authorization token.

Use these controls together:

- keep Explorer and proxy administration bound to localhost by default;
- require HTTPS before making Explorer reachable over a network;
- configure narrow `allowed_ips`, `trusted_proxies`, and `blocked_paths` rules;
- keep proxy administration local or behind an SSH tunnel;
- never inject a real Shodan key into a public Explorer;
- rotate Shodan keys and the admin password after suspected exposure; and
- review access logs and Shodan credit usage regularly.

## Known shodan-proxy v1.0.3 limitations

The proxy is intentionally pinned and is not modified by this repository. Its current
implementation has security-relevant behavior that operators must understand:

- `key=shodanproxy` selects the server-side Shodan key pool;
- omitting `key` also selects that pool;
- `shodanproxy` is hard-coded rather than a configurable gateway credential;
- an empty `allowed_ips` list permits every client;
- the initial administrator credentials are documented defaults;
- request bodies are only forwarded for `POST`, so body-bearing `PUT` operations
  may not behave as expected; and
- trusted-proxy configuration that is too broad can undermine IP filtering.

The Explorer compensates by always sending a configured key, binding to localhost,
blocking the administration surface on its public Nginx listener, using an explicit
API route allowlist, and exposing proxy administration only on `127.0.0.1`. These are
defense-in-depth measures and do not change the proxy's underlying behavior.

## Dependency and release controls

- Exact versions and a frozen pnpm lockfile are required.
- New packages wait seven days before normal adoption.
- Dependency lifecycle scripts and exotic transitive sources are blocked by default.
- Pull requests run linting, type checks, tests, builds, audits, dependency review,
  and a container build.
- Base images and the proxy image are pinned by digest.
- Release images publish an SBOM and build provenance.

## October 2026 Node.js security assessment

The [October 21 Node.js security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
fixes vulnerabilities affecting Node 24, including Brotli memory corruption
(CVE-2026-111497), DNS NUL truncation (CVE-2026-105482), TLS hostname verification
bypasses (CVE-2026-105483, CVE-2026-106069, CVE-2026-106072), HTTP keep-alive
response injection (CVE-2026-105481), snapshot entropy reuse (CVE-2026-106074),
and a permission-model bypass (CVE-2026-106073). The Node 26-only ZIP and wildcard
permission issues in that advisory do not apply to this project's Node 24 target.

Node 24.19.0, previously selected for CI and local development, predates these
fixes. Use **Node 24.22.1 or a newer patched Node 24 release**. CI and release
validation read `.nvmrc`; the frontend engine floor and Docker build image must be
updated alongside it. The build image is pinned to the verified 24.22.1 digest.

| Surface | Assessment |
| --- | --- |
| Production frontend | The final image serves static browser assets with Nginx and contains no Node.js runtime. These Node.js vulnerabilities have no direct execution path in this image. |
| CI, package installation, local development | These execute Node.js and must use the patched release. Installation and development tools process network and compressed data; absence of direct application calls is not a sufficient mitigation. |
| Application code | Shodan requests use browser `fetch`. The application does not implement Node DNS/TLS clients, Brotli decoding, startup snapshots, or the Node permission model. |
| Bundled proxy | This is an independently built, digest-pinned image. This assessment does not attest to the proxy image's internal dependencies or any deployed host's Node version. |

The same maintenance update upgrades vulnerable Vue/Vite/Vitest dependencies and
adds bounded overrides for patched `brace-expansion`, `source-map-js`, and
`postcss-selector-parser` versions. The complete lockfile audit had zero reported
vulnerabilities on October 27, 2026. This is a point-in-time registry audit, not a
guarantee against later disclosures. The Nginx stage upgrades all available Alpine
packages, covering the `libx11` fix that blocked earlier container scans.

## Dependency pull request maintenance

Dependabot runs on Mondays at 03:00 Asia/Shanghai. Routine minor and patch updates
are grouped into one frontend toolchain PR, one container PR, and one Actions PR.
Frontend and Actions major upgrades remain separate for compatibility review;
Node major upgrades and unsupported TypeScript majors stay excluded. Version-update
PR limits are two for npm and one each for Docker and Actions (four in total).
Security updates have their own frontend group and are not subject to these
version-update PR limits or Dependabot's version-update cooldown.

The seven-day pnpm package maturity policy still applies to installation, including
security updates. If an urgent fix is younger than seven days, review it and add
only an exact package-version exception before updating the lockfile; do not
disable the policy globally. All fixes adopted in this maintenance update passed
the existing maturity policy without exceptions.

Merge dependency updates only after the complete frontend checks, dependency
review, container build, smoke test, and HIGH/CRITICAL image scan pass. When several
updates are blocked by the same advisory, validate a consolidated update rather
than merging failing PRs individually. Remove obsolete overrides when the normal
dependency graph resolves patched versions without them.
