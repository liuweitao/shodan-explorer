# Migrating from Shodan Explorer v1 to v2

Version 2 modernizes the frontend and changes several deployment defaults. Back up
the proxy configuration directory before upgrading; it contains administrator
settings and Shodan keys.

## Breaking changes

- Vue 2 and Vue CLI are replaced by Vue 3, TypeScript, and Vite.
- npm's floating install is replaced by pnpm 11 with a frozen lockfile.
- Node.js 24.15 or newer in the Node 24 line is required for local builds.
- The default Explorer host URL changes from port 80 to
  `http://127.0.0.1:8080`.
- Proxy administration moves to the local-only
  `http://127.0.0.1:8081/admin` endpoint and is blocked on the Explorer listener.
- Runtime frontend configuration moves from an inline script to a non-cacheable
  `/runtime-config.json` response.
- Nginx no longer forwards every missing path to the proxy. Only documented Shodan
  API prefixes are allowed.
- Bulma, Axios, core-js, Vue Router, and vue-json-pretty are removed.

## Upgrade procedure

1. Stop the old stack without deleting its configuration:

   ```sh
   docker compose down
   ```

2. Make a protected backup of `config/`.

3. Pull v2 and create `.env` from `.env.example`.

4. Compare the existing proxy settings with `config/config.example.yaml`. Do not
   overwrite an existing `config.yaml` or `shodan_keys.yaml`.

5. Confirm that `allowed_ips` is not empty, `trusted_proxies` is narrow, and the
   administrator password has been changed from its documented default.

6. Build and start the new stack:

   ```sh
   docker compose up --build -d
   ```

7. Verify both health states, open the Explorer, and test a low-cost endpoint such
   as `/api-info` only if it is permitted by `blocked_paths`.

8. Confirm that `/admin` returns 404 through port 8080 and is available only through
   `127.0.0.1:8081`.

## Rollback

Stop v2, restore the protected configuration backup if it was changed, and redeploy
the previous immutable image tag. Never roll back by deleting the configuration
directory, because it contains the proxy's Shodan key pool.
