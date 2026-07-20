# AGENTS.md - 有家酸菜鱼品宣画面更新管理系统

## 项目概览
有家酸菜鱼品牌品宣画面更新管理系统，三步流水线管理85家门店的品宣画面更新：审核 → 设计 → 安装派发。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Package Manager**: pnpm

## 目录结构
```
src/
├── app/
│   ├── api/
│   │   ├── dashboard/route.ts    # Dashboard 统计接口
│   │   ├── submissions/route.ts  # 门店提交数据接口
│   │   ├── review/route.ts       # 画面审核接口
│   │   ├── design/route.ts       # 设计任务接口
│   │   └── installation/route.ts # 安装派发接口
│   ├── page.tsx                  # 主页面(Tab导航)
│   ├── layout.tsx                # 根布局
│   └── globals.css               # 全局样式
├── components/
│   ├── dashboard.tsx             # Dashboard 概览组件
│   ├── review-panel.tsx          # 画面审核面板
│   ├── design-panel.tsx          # 设计跟踪面板
│   ├── installation-panel.tsx    # 安装派发面板
│   ├── image-preview.tsx         # 图片预览弹窗
│   └── ui/                      # shadcn/ui 组件库
├── storage/database/
│   ├── supabase-client.ts        # Supabase 客户端
│   └── shared/schema.ts          # 数据库 Schema
└── lib/utils.ts                  # 工具函数
```

## 数据库表
- `submissions` - 门店提交记录 (area, store_name, remark, status)
- `images` - 上传图片 (submission_id, category, image_url)
- `review_items` - 审核项 (submission_id, image_id, category, review_status)
- `design_tasks` - 设计任务 (review_item_id, design_status, design_url, designer_note)
- `installation_tasks` - 安装任务 (design_task_id, install_status, company_name, dispatch_date, install_date, return_photo_url)

## 开发命令
- `pnpm dev` - 启动开发服务
- `pnpm build` - 构建生产版本
- `pnpm ts-check` - TypeScript 类型检查
- `pnpm lint` - ESLint 检查

## 业务流程
1. **画面审核** → 门店上传图片后，审核员逐张审核（通过/需更新/跳过）
2. **设计跟踪** → 标记为"需更新"的自动流入，设计师上传设计稿
3. **安装派发** → 设计确认后自动流入，派发给广告公司安装
