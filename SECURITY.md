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
