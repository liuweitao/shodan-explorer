# 参与 Shodan Explorer 开发

[English](CONTRIBUTING.md)

感谢你改进 Shodan Explorer。我们欢迎 Bug 报告、文档修复、测试、安全加固和范围明确
的功能建议。

## 开始之前

- 使用 Node 24 系列中不低于 24.15 的版本。
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
pnpm audit --prod --audit-level=high
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
