# 志愿参谋 - AI择校顾问

> AI驱动的高考志愿填报助手：像跟顾问聊天一样描述情况，AI给出个性化院校+专业推荐。

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 ANTHROPIC_API_KEY

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **样式**: Tailwind CSS，移动端优先
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **数据**: 本地 JSON（山东省23所高校录取数据）

## 目录结构

```
├── app/
│   ├── layout.jsx           # 根布局
│   ├── page.jsx             # 主页（状态管理）
│   ├── globals.css
│   └── api/recommend/
│       └── route.js         # POST /api/recommend
├── components/
│   ├── InputForm.jsx        # 3步向导表单
│   └── ResultsView.jsx      # 冲/稳/保推荐卡片
├── lib/
│   ├── claude.js            # Prompt Engineering + Claude API
│   └── dataLoader.js        # 院校数据加载和过滤
└── data/
    └── colleges.json        # 山东省高校数据（23所）
```

## 功能

- 3步输入：科目/分数 → 意向城市/兴趣方向/目标 → 择校偏好
- AI生成冲/稳/保各3所院校推荐，每条附3-5句针对性理由
- 覆盖山东省985到省属本科，分数线460-620
