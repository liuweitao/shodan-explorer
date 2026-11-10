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
pnpm audit --audit-level=high
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
High/critical findings with available fixes still fail the gate; no CVEs are ignored.

After successful main CI, automation updates outdated Dependabot frontend PRs from
main and explicitly dispatches CI. It recovers missing dispatches, but does not
blindly retry failed tests. A compatible exact patch/minor update can merge only
when all four gates pass on its current head containing the latest main. Before-1.0
minor updates, major versions, Docker and Actions changes, configuration changes,
and conflicts require review. The `do-not-automerge` label disables both refresh
and merge. Automation runs only trusted default-branch code and retains its
existing token permissions; PR CI has read-only repository access.

A failed daily security scan needs investigation if a fresh `apk upgrade` cannot
fix it. Review the upstream fixed version, update a pinned base image or dependency
when needed, and publish a new release to replace deployed images. A green CI run
does not update an already published image. Old failed runs remain as audit history.

Token-created branch updates also produce an approval-only duplicate PR run.
The explicitly dispatched CI supplies all four read-only gates. Daily successful
main sweeps re-evaluate existing green results because token-triggered events can
suppress the next workflow_run. Only the known approval-only duplicate may coexist
with a successful dispatch; actual failed/pending CI and branch-protection blocks
continue to prevent merging. No extra token or write permission is needed.
