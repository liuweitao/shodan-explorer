# Shodan Explorer

[简体中文](README_CN.md)

Shodan Explorer is a focused web workbench for learning, testing, and debugging the
[Shodan API](https://developer.shodan.io/api). It keeps Shodan's standard
`base_url + key` request contract and is designed to run with
[shodan-proxy](https://github.com/liuweitao/shodan-proxy) during shared development.

> [!IMPORTANT]
> The bundled `shodan-proxy v1.0.3` treats `key=shodanproxy` (and currently a missing
> key) as permission to use its server-side key pool. That marker is not a secret
> gateway credential. Keep the default deployment on localhost, configure IP
> allowlists, and read [SECURITY.md](SECURITY.md) before exposing it to a network.

## Highlights

- Interactive forms for Shodan search, scanning, alerts, notifiers, DNS, account,
  organization, and utility endpoints.
- Redacted request inspection and tree, formatted, or raw response views.
- Vue 3, TypeScript, Vite, responsive first-party CSS, and no runtime dependency
  other than Vue.
- Runtime API key configuration without rebuilding the frontend image.
- Pinned dependencies, a seven-day package maturity window, restricted lifecycle
  scripts, automated tests, and dependency review.
- Hardened Nginx container with an explicit API allowlist, strict browser headers,
  a read-only filesystem, and a non-root user.

## Architecture

```text
Browser :8080
    │ standard Shodan paths and ?key=...
    ▼
Explorer Nginx ── private Docker network ──► shodan-proxy :8080 ──► api.shodan.io
                                                    │
                                                    └─ server-side Shodan key pool

Proxy administration: 127.0.0.1:8081 only
```

The public Nginx route forwards only documented Shodan API prefixes. Proxy login,
administration, configuration, static admin assets, and key-management routes are
not exposed through the Explorer port.

## Requirements

- Docker Engine with Docker Compose v2; or
- Node.js 24.15 or newer in the Node 24 line and pnpm 11.21 for local frontend work.

The complete Compose stack currently requires `linux/amd64` because the pinned
`shodan-proxy v1.0.3` image does not publish an arm64 runtime image. The Explorer
image itself is built for amd64 and arm64.

## Quick start

1. Clone the repository and create local configuration:

   ```sh
   git clone https://github.com/liuweitao/shodan-explorer.git
   cd shodan-explorer
   cp .env.example .env
   cp config/config.example.yaml config/config.yaml
   cp config/shodan_keys.example.yaml config/shodan_keys.yaml
   ```

2. Add one or more real Shodan keys to `config/shodan_keys.yaml`:

   ```yaml
   - YOUR_SHODAN_API_KEY
   ```

3. Review `allowed_ips`, `trusted_proxies`, and `blocked_paths` in
   `config/config.yaml`, then start the stack:

   ```sh
   docker compose up --build -d
   ```

4. Open the Explorer at <http://127.0.0.1:8080>.

5. Open proxy administration at <http://127.0.0.1:8081/admin>. On an untouched
   `v1.0.3` configuration, sign in with `admin` / `shodanproxy` and change the
   password immediately. For a remote host, keep port 8081 bound to localhost and
   use an SSH tunnel.

To inspect the stack:

```sh
docker compose ps
docker compose logs --tail=100
```

## Configuration

| Variable                       | Default                           | Purpose                                                                                   |
| ------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `SHODAN_API_KEY`               | `shodanproxy`                     | Gateway marker or a caller-owned Shodan key sent using the standard `key` query parameter |
| `SHODAN_BASE_URL`              | `http://shodan-proxy:8080`        | Nginx upstream; may point to another Shodan-compatible base URL                           |
| `SHODAN_EXPLORER_BIND_ADDRESS` | `127.0.0.1`                       | Host address publishing the Explorer                                                      |
| `SHODAN_EXPLORER_PORT`         | `8080`                            | Explorer host port                                                                        |
| `SHODAN_PROXY_ADMIN_PORT`      | `8081`                            | Local-only proxy administration port                                                      |
| `SHODAN_EXPLORER_IMAGE`        | `liuweitao/shodan-explorer:2.0.0` | Optional immutable Explorer image override                                                |

`SHODAN_API_KEY` is delivered to the browser at runtime because Shodan-compatible
clients put the key in the query string. Use the disposable proxy marker for shared
development. Never put a production Shodan key into a publicly reachable Explorer.

### Direct Shodan mode

The Explorer container can use Shodan directly by setting:

```text
SHODAN_BASE_URL=https://api.shodan.io
SHODAN_API_KEY=<real Shodan key>
```

This exposes the real key to every browser user and should only be used on a local,
single-user deployment. Removing the proxy from another Shodan-compatible project
does not require application-code changes, but a project using the gateway marker
must replace it with a real Shodan key as well as changing the base URL.

## Local frontend development

Start only the pinned proxy, prepare the Vite environment, and run the frontend:

```sh
docker compose up -d shodan-proxy
cd frontend
cp .env.example .env.local
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Vite serves runtime configuration and proxies Shodan-compatible paths to
`http://127.0.0.1:8081` by default.

Useful commands:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --audit-level=high
```

## Dependency policy

- Direct dependency versions are exact and the full graph is locked in
  `pnpm-lock.yaml`.
- Newly published packages are held for seven days by default.
- Transitive Git, URL, and other exotic dependency sources are blocked.
- Dependency build scripts are blocked unless explicitly approved; only `esbuild`
  is currently allowed.
- CI installs with `--frozen-lockfile`, reviews dependency changes, audits production
  packages, and builds the container.
- Release images include an SBOM and build provenance.

## API coverage

The UI covers search, on-demand scanning, network alerts, notifiers, directory
methods, enterprise bulk data and organization methods, account information, DNS,
utilities, and API plan information. The proxy's `blocked_paths` configuration may
intentionally deny sensitive endpoints.

## Repository layout

```text
shodan-explorer/
├── .github/                 CI, releases, and dependency updates
├── config/                  Safe examples; runtime secrets are ignored
├── docs/                    Migration notes
├── frontend/
│   ├── public/              Static runtime defaults
│   ├── src/                 Vue 3 and TypeScript application
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── compose.yaml
├── README.md
├── README_CN.md
└── SECURITY.md
```

## Upgrading from v1

Version 2 changes the Node toolchain, host port, frontend framework, runtime config,
and public proxy routing. Follow [the v2 migration guide](docs/MIGRATION_V2.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) or the
[Chinese contribution guide](CONTRIBUTING_CN.md). Please report security issues
according to [SECURITY.md](SECURITY.md), not through a public issue.

## License

Released under the [MIT License](LICENSE).
