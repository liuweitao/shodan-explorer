# Shodan Explorer

[English](README.md)

Shodan Explorer 是一个用于学习、测试和调试
[Shodan API](https://developer.shodan.io/api) 的 Web 工作台。它保持 Shodan 标准的
`base_url + key` 调用契约，并面向多人研发场景与
[shodan-proxy](https://github.com/liuweitao/shodan-proxy) 配合使用。

> [!IMPORTANT]
> 当前固定的 `shodan-proxy v1.0.3` 会在收到 `key=shodanproxy` 时使用服务端 Key
> 池，而且当前版本未传 Key 时也会这样处理。`shodanproxy` 只是公开兼容标记，不是
> 秘密网关凭据。请保持默认的本机监听，配置 IP 白名单，并在对外开放前阅读
> [SECURITY.md](SECURITY.md)。

## 主要特性

- 为 Shodan 搜索、扫描、告警、通知器、DNS、账户、组织和工具接口提供交互表单。
- 展示已脱敏的请求，并以树形、格式化或原始形式查看响应。
- 使用 Vue 3、TypeScript、Vite 和项目自有响应式 CSS；运行时 npm 依赖仅有 Vue。
- 无需重建前端镜像即可配置 API Key。
- 固定依赖版本，设置七天新包观察期，限制安装脚本，并提供自动测试和依赖审查。
- Nginx 采用 API 路径白名单、严格浏览器安全头、只读文件系统和非 root 用户。

## 架构

```text
浏览器 :8080
    │ 标准 Shodan 路径与 ?key=...
    ▼
Explorer Nginx ── Docker 内部网络 ──► shodan-proxy :8080 ──► api.shodan.io
                                                  │
                                                  └─ 服务端 Shodan Key 池

代理管理端：仅 127.0.0.1:8081
```

公共 Nginx 仅转发明确支持的 Shodan API 路径。代理登录、管理、配置、管理后台静态
文件和 Key 管理接口不会通过 Explorer 端口暴露。

## 环境要求

- Docker Engine 与 Docker Compose v2；或者
- 本地前端开发使用 Node.js 24.15 以上的 Node 24 版本，以及 pnpm 11.21。

由于固定的 `shodan-proxy v1.0.3` 没有发布 arm64 运行镜像，完整 Compose 栈当前
需要 `linux/amd64`。Explorer 镜像本身支持 amd64 和 arm64。

## 快速开始

1. 克隆仓库并创建本地配置：

   ```sh
   git clone https://github.com/liuweitao/shodan-explorer.git
   cd shodan-explorer
   cp .env.example .env
   cp config/config.example.yaml config/config.yaml
   cp config/shodan_keys.example.yaml config/shodan_keys.yaml
   ```

2. 将一个或多个真实 Shodan Key 写入 `config/shodan_keys.yaml`：

   ```yaml
   - YOUR_SHODAN_API_KEY
   ```

3. 检查 `config/config.yaml` 中的 `allowed_ips`、`trusted_proxies` 和
   `blocked_paths`，然后启动：

   ```sh
   docker compose up --build -d
   ```

4. 打开 <http://127.0.0.1:8080> 使用 Explorer。

5. 在 <http://127.0.0.1:8081/admin> 管理代理。全新 `v1.0.3` 配置的初始账户是
   `admin` / `shodanproxy`，登录后必须立即修改密码。远程主机应继续让 8081 端口
   仅监听本机，并通过 SSH 隧道管理。

检查运行状态：

```sh
docker compose ps
docker compose logs --tail=100
```

## 配置

| 变量                           | 默认值                            | 用途                                                           |
| ------------------------------ | --------------------------------- | -------------------------------------------------------------- |
| `SHODAN_API_KEY`               | `shodanproxy`                     | 通过标准 `key` 查询参数发送的网关标记或调用者自己的 Shodan Key |
| `SHODAN_BASE_URL`              | `http://shodan-proxy:8080`        | Nginx 上游，可替换为其他兼容 Shodan 的 Base URL                |
| `SHODAN_EXPLORER_BIND_ADDRESS` | `127.0.0.1`                       | Explorer 在宿主机上的监听地址                                  |
| `SHODAN_EXPLORER_PORT`         | `8080`                            | Explorer 宿主机端口                                            |
| `SHODAN_PROXY_ADMIN_PORT`      | `8081`                            | 仅限本机的代理管理端口                                         |
| `SHODAN_EXPLORER_IMAGE`        | `liuweitao/shodan-explorer:2.0.0` | 可选的不可变 Explorer 镜像覆盖值                               |

由于兼容 Shodan 的客户端将 Key 放在查询参数中，`SHODAN_API_KEY` 会在运行时提供给
浏览器。多人开发时应使用可撤销的代理标记，绝不能在公网 Explorer 中配置生产用
Shodan Key。

### 直连 Shodan

设置以下变量即可让 Explorer 容器直接使用 Shodan：

```text
SHODAN_BASE_URL=https://api.shodan.io
SHODAN_API_KEY=<真实 Shodan Key>
```

这会让每个网页访问者都能看到真实 Key，因此只适合本机单用户部署。其他兼容 Shodan
的项目撤掉代理时无需修改业务代码，但如果研发阶段使用的是网关标记，除了修改 Base
URL，还必须将配置中的 Key 换成真实 Shodan Key。

## 本地前端开发

只启动固定版本的代理，准备 Vite 环境并运行前端：

```sh
docker compose up -d shodan-proxy
cd frontend
cp .env.example .env.local
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Vite 默认提供运行时配置，并将兼容 Shodan 的路径代理到
`http://127.0.0.1:8081`。

常用命令：

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --audit-level=high
```

## 依赖安全策略

- 直接依赖使用精确版本，完整依赖图固定在 `pnpm-lock.yaml`。
- 新发布的软件包默认经过七天观察期。
- 禁止传递依赖使用 Git、任意 URL 等非常规来源。
- 依赖构建脚本默认禁止，当前只允许经过审核的 `esbuild`。
- CI 使用冻结锁文件安装，审查依赖变更，审计生产依赖并构建容器。
- 发布镜像附带 SBOM 和构建来源证明。

## API 覆盖范围

界面覆盖搜索、按需扫描、网络告警、通知器、目录、企业批量数据与组织管理、账户、
DNS、工具和 API 套餐信息。代理的 `blocked_paths` 配置可能会主动拒绝敏感接口。

## 项目结构

```text
shodan-explorer/
├── .github/                 CI、发布和依赖更新
├── config/                  安全示例；运行时密钥已忽略
├── docs/                    迁移说明
├── frontend/
│   ├── public/              静态运行时默认值
│   ├── src/                 Vue 3 与 TypeScript 应用
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── compose.yaml
├── README.md
├── README_CN.md
└── SECURITY.md
```

## 从 v1 升级

v2 调整了 Node 工具链、宿主机端口、前端框架、运行时配置和代理公开路由。请按照
[v2 迁移指南](docs/MIGRATION_V2.md) 操作。

## 参与贡献

请阅读 [英文贡献指南](CONTRIBUTING.md) 或 [中文贡献指南](CONTRIBUTING_CN.md)。
安全问题请按照 [SECURITY.md](SECURITY.md) 私下报告，不要创建公开 Issue。

## 许可证

本项目采用 [MIT License](LICENSE)。
