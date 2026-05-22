# VALORANT Custom Team Builder

VALORANT カスタム向けのチーム分け・マップ選択・エージェント補助ツールです。

## Stack

- Next.js 16 / React 19
- Tailwind CSS 4
- Supabase Postgres
- Vercel
- Vitest

環境変数が未設定の場合は、従来どおりインメモリのデモストアで動きます。

## Local Development

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:3000> を開きます。

## Supabase Setup

1. Supabase SQL Editor で [supabase/schema.sql](./supabase/schema.sql) を実行します。
2. `.env.example` を参考に `.env.local` を作ります。
3. Vercel にデプロイする場合も同じ環境変数を Project Settings に設定します。

`SUPABASE_SERVICE_ROLE_KEY` はサーバー専用です。`NEXT_PUBLIC_` を付けるとブラウザへ漏れるので不可です。

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
