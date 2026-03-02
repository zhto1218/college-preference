# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## 务必遵守以下规定
回答必须是中文
尽量复用现成的代码，不过要求严格符合需求
每次验证功能或检查语法，不需要执行 pnpm build 过程
每次功能改动或新增需求，中间不要生成过程文档，功能相关的测试文档，使用文档，分析文档等合并成一个说明文档即可
文档的命名务必使用中文

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Run production build
```

No test suite is configured. There is no linter configured.

Setup: `cp .env.local.example .env.local` and add at least one AI API key before running.

## Architecture

Single Next.js 15 App Router project. No separate frontend/backend — API routes and React components coexist.

**Request flow:**
`components/InputForm.jsx` (3-step wizard) → `app/page.jsx` (state: input/loading/results) → `POST /api/recommend` → `lib/ai.js` → AI provider → `normalizeResponse()` → `components/ResultsView.jsx` (冲/稳/保 cards)

**Key architectural decisions:**

**Multi-provider AI (`lib/ai.js`):** Supports Anthropic, OpenAI, and Gemini. Provider is auto-detected from whichever API key is set, or forced via `AI_PROVIDER` env var. When `GEMINI_BASE_URL` is set, Gemini falls back to the OpenAI-compatible client (most proxies use this format). Do NOT use `response_format: { type: 'json_object' }` — proxy services reject it.

**Response normalization (`normalizeResponse` in `lib/ai.js`):** Models frequently ignore the JSON format instructions and return their own structure (e.g., `{student_profile, recommendations: [...]}` instead of `{analysis, recommendations: {reach, match, safety}}`). `normalizeResponse` handles this by detecting and remapping array-based formats. When extending prompt logic, assume the normalizer may need updating too.

**College data (`lib/dataLoader.js`):** `filterColleges` returns colleges within ±50 points of the user's score, falling back to the top 20 if none match. Data is loaded once and cached in module scope. All 23 colleges are in `data/colleges.json` covering 山东省, score range ~460–620.

**`postcss.config.js` must use `module.exports`** (CommonJS), not ESM `export default` — Next.js requires this.

## Environment Variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude |
| `OPENAI_API_KEY` | OpenAI |
| `GEMINI_API_KEY` | Google Gemini |
| `AI_PROVIDER` | Force provider: `anthropic` / `openai` / `gemini` |
| `OPENAI_BASE_URL` | Proxy base URL for OpenAI (e.g. `https://proxy.com/v1`) |
| `OPENAI_MODEL` | Override model name (default: `gpt-5.2`) |
| `GEMINI_BASE_URL` | Proxy base URL for Gemini — triggers OpenAI-compat client |
| `GEMINI_MODEL` | Override model name (default: `gemini-2.5-flash`) |
| `ANTHROPIC_BASE_URL` | Proxy base URL for Anthropic |

## College Data Schema

Each entry in `data/colleges.json` has: `id`, `name`, `type`, `tags`, `city`, `features[]`, `strongMajors[]`, `admission.{science,arts}.{2023,2022,2021}`, `employment.{rate,grad_rate,avg_salary}`, `tuition`, `category`.

To add more colleges or provinces, extend `data/colleges.json` following the existing schema. The `filterColleges` function currently only filters by score range and does not filter by province.
