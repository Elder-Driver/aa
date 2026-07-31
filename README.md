# 分账搭子 SplitPack

多人旅行分账工具。创建账本、邀请朋友加入、记录支出，并按净余额生成最少转账方案。

## 功能

- 默认美元，可选择人民币、欧元、英镑、日元等常用币种
- 中文优先，支持 English 切换
- 邀请链接加入，无需邮箱注册
- 支持部分成员分摊
- 支持均分和自定义金额
- 支持记录实际还款
- 使用 Cloudflare D1 保存数据

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

## Cloudflare 自动部署建议

在 Cloudflare 创建 Worker 时选择 `Continue with GitHub`，连接本仓库。

推荐设置：

- Repository: `Elder-Driver/aa`
- Production branch: `main`
- Build command: `pnpm build`
- Output: 使用项目生成的 Cloudflare Worker 构建产物
- D1 binding: `DB`

数据库结构通过 `drizzle/` 里的 SQL migration 管理。以后如果修改数据库结构，需要先生成并提交 migration，再部署。
