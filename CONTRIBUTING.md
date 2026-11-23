# Contributing to Shodan Explorer

[简体中文](CONTRIBUTING_CN.md)

Thank you for improving Shodan Explorer. Bug reports, documentation fixes, tests,
security hardening, and focused feature proposals are welcome.

## Before you start

- Use the Node.js version pinned in `.nvmrc` (Node 24).
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
pnpm audit --audit-level=moderate
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

## Automated dependency maintenance

CI also runs daily at 20:23 UTC (04:23 Asia/Shanghai; scheduled runs may be delayed).
Both CI and release builds rebuild the `runtime` stage without a layer cache, so
`apk upgrade` fetches current security fixes while the frontend build stays cached.
Dependency audit and review block moderate or worse findings; container scans block
fixable high/critical findings. No CVEs are ignored.

After successful main CI, automation refreshes eligible Dependabot frontend
dependencies and pinned Docker base images against main, recovers missing CI
dispatches, and merges the tested head when all CI jobs pass. Container builds,
smoke tests, and scans run on amd64 and arm64. For read-only CI Action updates,
automation verifies eligible changes against the upstream tags and logs the
result for the maintainer who merges the PR. Add the `do-not-automerge` label to
opt out. See [Dependency auto-merge](SECURITY.md#dependency-auto-merge) for the
version and file rules.

A failed daily security scan needs investigation if a fresh `apk upgrade` cannot
fix it. Review the upstream fixed version, update a pinned base image or dependency
when needed, and publish a new release to replace deployed images. A green CI run
does not update an already published image. Old failed runs remain as audit history.

Token-created branch updates also produce an approval-only duplicate PR run.
The explicitly dispatched CI runs all read-only checks. Daily successful
main sweeps re-evaluate existing green results because token-triggered events can
suppress the next workflow_run. Only the known approval-only duplicate may coexist
with a successful dispatch; actual failed/pending CI and branch-protection blocks
continue to prevent merging. No extra token or write permission is needed.
