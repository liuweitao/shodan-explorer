# Contributing to Shodan Explorer

[简体中文](CONTRIBUTING_CN.md)

Thank you for improving Shodan Explorer. Bug reports, documentation fixes, tests,
security hardening, and focused feature proposals are welcome.

## Before you start

- Use Node.js 24.15 or newer in the Node 24 line.
- Use the package manager pinned in `frontend/package.json` through Corepack.
- Never commit `.env`, `config/config.yaml`, `config/shodan_keys.yaml`, API keys,
  proxy credentials, or captured Shodan responses containing sensitive data.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## Development setup

```sh
git clone https://github.com/liuweitao/shodan-explorer.git
cd shodan-explorer/frontend
cp .env.example .env.local
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The default development target is the proxy administration binding at
`http://127.0.0.1:8081`. Start it from the repository root with:

```sh
docker compose up -d shodan-proxy
```

## Quality checks

Run the complete local gate before opening a pull request:

```sh
pnpm run check
pnpm audit --prod --audit-level=high
```

Add or update tests for behavior changes. Request-building tests must confirm that
displayed snapshots redact the `key` parameter.

## Pull requests

1. Create a focused branch.
2. Keep unrelated formatting or dependency changes out of the pull request.
3. Explain the user-visible behavior, security impact, and verification performed.
4. Update both `README.md` and `README_CN.md` when their shared content changes.
5. Wait for CI, dependency review, tests, and container build to pass.

Dependency updates must retain exact versions, the seven-day maturity policy, and
the lifecycle-script allowlist. Do not bypass these controls to make an upgrade pass.
