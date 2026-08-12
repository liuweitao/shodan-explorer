# Runtime configuration

Copy the example files without the `.example` suffix before starting the stack:

```sh
cp config/config.example.yaml config/config.yaml
cp config/shodan_keys.example.yaml config/shodan_keys.yaml
```

Add real Shodan keys only to `shodan_keys.yaml`. The runtime files are ignored by
Git and must never be committed. Restrict their permissions to the account that
runs Docker.

The bundled `shodan-proxy` release allows all clients when `allowed_ips` is
empty. Review the example CIDRs before exposing the service outside localhost.
