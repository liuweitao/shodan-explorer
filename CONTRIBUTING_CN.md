# 参与 Shodan Explorer 开发

[English](CONTRIBUTING.md)

感谢你改进 Shodan Explorer。我们欢迎 Bug 报告、文档修复、测试、安全加固和范围明确
的功能建议。

## 开始之前

- 使用 `.nvmrc` 固定的 Node.js 版本（Node 24 系列）。
- 通过 Corepack 使用 `frontend/package.json` 固定的包管理器。
- 绝不能提交 `.env`、`config/config.yaml`、`config/shodan_keys.yaml`、API Key、
  代理凭据或包含敏感内容的 Shodan 响应。
- 安全漏洞请按照 [SECURITY.md](SECURITY.md) 私下报告。

## 开发环境

```sh
git clone https://github.com/liuweitao/shodan-explorer.git
cd shodan-explorer/frontend
cp .env.example .env.local
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

默认开发上游是代理在本机公开的 `http://127.0.0.1:8081`。在仓库根目录启动代理：

```sh
docker compose up -d shodan-proxy
```

## 质量检查

提交 Pull Request 前运行完整检查：

```sh
pnpm run check
pnpm audit --audit-level=moderate
```

行为变更必须增加或更新测试。请求构造测试必须确认展示给用户的请求已隐藏 `key`
参数。

## Pull Request

1. 创建职责单一的分支。
2. 不要混入无关格式化或依赖变更。
3. 说明用户可见变化、安全影响和验证结果。
4. 公共文档内容变化时，同时更新 `README.md` 和 `README_CN.md`。
5. 等待 CI、依赖审查、测试和容器构建全部通过。

依赖升级必须保留精确版本、七天观察期和安装脚本白名单。不得为了通过升级而绕过这些
控制。

## 自动依赖维护

CI 每天在 UTC 20:23（北京时间次日 04:23，调度可能延迟）执行一次。
CI 和发布构建都禁用 `runtime` 阶段的层缓存，让 `apk upgrade` 获取最新安全修复，
前端构建仍使用缓存。依赖审计与审查阻止中危及以上告警，容器扫描阻止有修复版本的高危和
严重漏洞，不忽略 CVE。

main 的 CI 成功后，自动化会将符合条件的 Dependabot 前端依赖和 Docker 基础镜像 PR
同步到最新 main，补发丢失的 CI 触发请求，并在全部检查通过后合并已验证的提交。
容器构建、冒烟测试和扫描同时覆盖 amd64 和 arm64。对于只读 CI 工作流中的 Action 更新，
自动化会核对符合条件的版本改动和上游标签，并记录结果供维护者合并时查阅。
添加 `do-not-automerge` 标签可退出自动处理。版本和文件规则见
[依赖自动合并说明](SECURITY.md#dependency-auto-merge)。

每日安全扫描失败且全新 `apk upgrade` 仍不能修复时，需要核查上游修复版本，按需更新
固定的基础镜像或依赖，并发布新版本替换已部署镜像。CI 通过不会更新已发布的镜像。
历史失败记录保留用于审计。

令牌更新分支还会产生一条待批准的重复 PR 运行；显式触发的 CI 会运行全部只读检查。
由于令牌触发的事件可能抑制下一条 workflow_run，每日 main 检查成功后还会复核已有的
成功结果。只有这种已知的待批准重复运行可以与全绿的显式 CI 并存；真实失败、运行中的
CI 和分支保护阻断仍会阻止合并。不需要额外令牌或写权限。
