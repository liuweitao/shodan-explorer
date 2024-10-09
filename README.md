# Shodan Explorer

Shodan Explorer 是一个 Web 项目，旨在帮助用户学习和熟悉各种 Shodan API。它提供了一个便捷的界面，允许用户直接从网页上测试和调试这些 API。

## 功能特点

- 为 [官方文档](https://developer.shodan.io/api) 中提到的每个 Shodan API 端点提供交互式表单
- 可轻松编辑的输入字段，用于调整 API 参数
- 每个表单都有提交按钮以发送请求
- 每个 API 有两个输出区域：
  1. 请求内容显示
  2. API 响应显示
- 使用 AJAX 技术实现无缝用户体验
- 支持复制响应到剪贴板和保存响应到文件

## 技术栈

- 前端：
  - [Bulma](https://bulma.io/) 用于构建美观且响应式的 UI
  - [Vue.js](https://vuejs.org/) 用于创建动态和交互式组件
  - JavaScript ES6+ 用于前端逻辑
- 后端：
  - [Shodan Proxy](https://github.com/liuweitao/shodan-proxy) 用于处理 Shodan API 请求
- 容器化：
  - [Docker](https://www.docker.com/) 用于简化部署和确保环境一致性
- 服务器：
  - Nginx 用于静态文件服务和反向代理

## 项目结构

shodan-explorer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApiForm.vue
│   │   │   └── ApiOutput.vue
│   │   ├── views/
│   │   │   └── Home.vue
│   │   ├── data/
│   │   │   └── apiGroups.js
│   │   ├── App.vue
│   │   └── main.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── compose.yaml
└── README.md

## API 结构

本项目涵盖了 Shodan API 的多个方面，包括：

1. 搜索方法
2. 按需扫描
3. 网络警报
4. 通知器
5. 目录方法
6. 批量数据（企业版）
7. 管理组织（企业版）
8. 账户方法
9. DNS 方法
10. 实用方法
11. API 状态方法

每个类别都包含多个相关的 API 端点，用户可以通过界面轻松测试和探索这些 API。

## 安装

1. 创建并进入项目目录： 
   ```
   mkdir shodan-explorer && cd shodan-explorer
   ```

2. 下载 compose.yaml 文件：
   ```
   curl -O https://raw.githubusercontent.com/liuweitao/shodan-explorer/main/compose.yaml
   ```

3. 启动容器：
   ```
   docker compose up -d
   ```

   应用程序将在 `http://localhost` 上可用。所有 API 请求将通过 Shodan Proxy 服务转发到 Shodan API。

4. 首次运行配置：
   1. 在浏览器中打开 `http://localhost/admin`
   2. 进行必要的初始设置：
      - 修改管理员密码
      - 添加 Shodan API Key
      - 设置允许访问的白名单 IP 地址
   3. 完成这些设置后，Shodan Explorer 就可以正常使用了

注意：请确保妥善保管您的管理员密码，并根据需要适当配置白名单 IP，以确保应用程序的安全性。

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

本项目是开源的，遵循 [MIT 许可证](LICENSE).

## 联系方式

如有任何问题或建议，请通过以下方式联系我们：

- 开启一个 [GitHub Issue](https://github.com/liuweitao/shodan-explorer/issues)
- 发送邮件至 [me@liuweitao.cn](mailto:me@liuweitao.cn)

感谢您对 Shodan Explorer 项目的关注和支持！