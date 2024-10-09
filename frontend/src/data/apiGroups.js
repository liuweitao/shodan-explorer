export const apiGroups = [
    {
      name: '1. Search Methods',
      chineseName: '1. 搜索方法',
      apis: [
        { name: 'Host Information', chineseName: '主机信息', endpoint: '/shodan/host/{ip}', params: ['ip'], optionalParams: ['history', 'minify'], request: null, response: null, selectOptions: { history: ['true', 'false'], minify: ['true', 'false'] } },
        { name: 'Search Count', chineseName: '搜索计数', endpoint: '/shodan/host/count', params: ['query'], optionalParams: ['facets'], request: null, response: null },
        { name: 'Search Shodan', chineseName: 'Shodan搜索', endpoint: '/shodan/host/search', params: ['query'], optionalParams: ['facets', 'page', 'minify'], request: null, response: null, selectOptions: { minify: ['true', 'false'] } },
        { name: 'Search Facets', chineseName: '搜索分面', endpoint: '/shodan/host/search/facets', params: [], request: null, response: null },
        { name: 'List Filters', chineseName: '列出过滤器', endpoint: '/shodan/host/search/filters', params: [], request: null, response: null },
        { name: 'Tokens', chineseName: '标记', endpoint: '/shodan/host/search/tokens', params: ['query'], request: null, response: null },
      ]
    },
    {
      name: '2. On-Demand Scanning',
      chineseName: '2. 按需扫描',
      apis: [
        { name: 'Ports', chineseName: '端口', endpoint: '/shodan/ports', params: [], request: null, response: null },
        { name: 'Protocols', chineseName: '协议', endpoint: '/shodan/protocols', params: [], request: null, response: null },
        { name: 'Scan IP', chineseName: '扫描IP', endpoint: '/shodan/scan', params: ['ips'], request: null, response: null, method: 'POST' },
        { name: 'Scan Internet', chineseName: '扫描互联网', endpoint: '/shodan/scan/internet', params: ['port', 'protocol'], request: null, response: null, method: 'POST' },
        { name: 'List Scans', chineseName: '列出扫描', endpoint: '/shodan/scans', params: [], optionalParams: ['page'], request: null, response: null },
        { name: 'Scan Status', chineseName: '扫描状态', endpoint: '/shodan/scan/{id}', params: ['id'], request: null, response: null },
      ]
    },
    {
      name: '3. Network Alerts',
      chineseName: '3. 网络警报',
      apis: [
        { name: 'Create Alert', chineseName: '创建警报', endpoint: '/shodan/alert', params: ['name', 'filters'], optionalParams: ['expires'], request: null, response: null, method: 'POST', jsonParams: ['filters'], jsonBody: ['name', 'filters', 'expires'] },
        { name: 'Get Alert', chineseName: '获取警报', endpoint: '/shodan/alert/{id}/info', params: ['id'], request: null, response: null },
        { name: 'Delete Alert', chineseName: '删除警报', endpoint: '/shodan/alert/{id}', params: ['id'], request: null, response: null, method: 'DELETE' },
        { name: 'Update Alert', chineseName: '更新警报', endpoint: '/shodan/alert/{id}', params: ['id'], optionalParams: ['filters'], request: null, response: null, method: 'POST', jsonParams: ['filters'], jsonBody: ['filters'] },
        { name: 'List Alerts', chineseName: '列出警报', endpoint: '/shodan/alert/info', params: [], request: null, response: null },
        { name: 'Alert Triggers', chineseName: '警报触发器', endpoint: '/shodan/alert/triggers', params: [], request: null, response: null },
        { name: 'Enable Trigger', chineseName: '启用触发器', endpoint: '/shodan/alert/{id}/trigger/{trigger}', params: ['id', 'trigger'], request: null, response: null, method: 'PUT' },
        { name: 'Disable Trigger', chineseName: '禁用触发器', endpoint: '/shodan/alert/{id}/trigger/{trigger}', params: ['id', 'trigger'], request: null, response: null, method: 'DELETE' },
        { name: 'Ignore Service', chineseName: '忽略服务', endpoint: '/shodan/alert/{id}/trigger/{trigger}/ignore/{service}', params: ['id', 'trigger', 'service'], request: null, response: null, method: 'PUT' },
        { name: 'Unignore Service', chineseName: '取消忽略服务', endpoint: '/shodan/alert/{id}/trigger/{trigger}/ignore/{service}', params: ['id', 'trigger', 'service'], request: null, response: null, method: 'DELETE' },
        { name: 'Add Notifier', chineseName: '添加通知器', endpoint: '/shodan/alert/{id}/notifier/{notifier_id}', params: ['id', 'notifier_id'], request: null, response: null, method: 'PUT' },
        { name: 'Remove Notifier', chineseName: '移除通知器', endpoint: '/shodan/alert/{id}/notifier/{notifier_id}', params: ['id', 'notifier_id'], request: null, response: null, method: 'DELETE' },
      ]
    },
    {
      name: '4. Notifiers',
      chineseName: '4. 通知器',
      apis: [
        { name: 'List Notifiers', chineseName: '列出通知器', endpoint: '/notifier', params: [], request: null, response: null },
        { name: 'List Notifier Providers', chineseName: '列出通知器提供者', endpoint: '/notifier/provider', params: [], request: null, response: null },
        { name: 'Create Notifier', chineseName: '创建通知器', endpoint: '/notifier', params: ['provider', 'description', '**args'], request: null, response: null, method: 'POST' },
        { name: 'Delete Notifier', chineseName: '删除通知器', endpoint: '/notifier/{id}', params: ['id'], request: null, response: null, method: 'DELETE' },
        { name: 'Get Notifier', chineseName: '获取通知器', endpoint: '/notifier/{id}', params: ['id'], request: null, response: null },
        { name: 'Update Notifier', chineseName: '更新通知器', endpoint: '/notifier/{id}', params: ['id','**args'], request: null, response: null, method: 'PUT' },
      ]
    },
    {
      name: '5. Directory Methods',
      chineseName: '5. 目录方法',
      apis: [
        { name: 'List Queries', chineseName: '列出查询', endpoint: '/shodan/query', params: [], optionalParams: ['page', 'sort', 'order'], request: null, response: null, selectOptions: { sort: ['votes', 'timestamp'], order: ['asc', 'desc'] } },
        { name: 'Search Queries', chineseName: '搜索查询', endpoint: '/shodan/query/search', params: ['query'], optionalParams: ['page'], request: null, response: null },
        { name: 'List Query Tags', chineseName: '列出查询标签', endpoint: '/shodan/query/tags', params: [], optionalParams: ['size'], request: null, response: null },
      ]
    },
    {
      name: '6. Bulk Data (Enterprise)',
      chineseName: '6. 批量数据（企业版）',
      apis: [
        { name: 'List Datasets', chineseName: '列出数据集', endpoint: '/shodan/data', params: [], request: null, response: null },
        { name: 'List Dataset Files', chineseName: '列出数据集文件', endpoint: '/shodan/data/{dataset}', params: ['dataset'], request: null, response: null },
      ]
    },
    {
      name: '7. Manage Organization (Enterprise)',
      chineseName: '7. 管理组织（企业版）',
      apis: [
        { name: 'Get Organization', chineseName: '获取组织', endpoint: '/org', params: [], request: null, response: null },
        { name: 'Add Organization Member', chineseName: '添加组织成员', endpoint: '/org/member/{user}', params: ['user'], request: null, response: null, method: 'PUT' },
        { name: 'Remove Organization Member', chineseName: '移除组织成员', endpoint: '/org/member/{user}', params: ['user'], request: null, response: null, method: 'DELETE' },
      ]
    },
    {
      name: '8. Account Methods',
      chineseName: '8. 账户方法',
      apis: [
        { name: 'Account Profile', chineseName: '账户资料', endpoint: '/account/profile', params: [], request: null, response: null },
      ]
    },
    {
      name: '9. DNS Methods',
      chineseName: '9. DNS方法',
      apis: [
        { name: 'Domain Info', chineseName: '域名信息', endpoint: '/dns/domain/{domain}', params: ['domain'], request: null, response: null },
        { name: 'DNS Lookup', chineseName: 'DNS查询', endpoint: '/dns/resolve', params: ['hostnames'], request: null, response: null },
        { name: 'Reverse DNS Lookup', chineseName: '反向DNS查询', endpoint: '/dns/reverse', params: ['ips'], request: null, response: null },
      ]
    },
    {
      name: '10. Utility Methods',
      chineseName: '10. 实用方法',
      apis: [
        { name: 'HTTP Headers', chineseName: 'HTTP头部', endpoint: '/tools/httpheaders', params: [], request: null, response: null },
        { name: 'My IP Address', chineseName: '我的IP地址', endpoint: '/tools/myip', params: [], request: null, response: null },
      ]
    },
    {
      name: '11. API Status Methods',
      chineseName: '11. API状态方法',
      apis: [
        { name: 'API Plan Information', chineseName: 'API计划信息', endpoint: '/api-info', params: [], request: null, response: null },
      ]
    },
  ];