# セッション引き継ぎメモ

## プロジェクト概要
飲食店向けレシピ原価管理SaaS「RecipeCost」
- **フレームワーク**: Next.js 14 (App Router) + Tailwind CSS
- **DB/認証**: Supabase (PostgreSQL + Auth + RLS)
- **デプロイ**: Vercel（cursor-ai-recipe-management-mock.vercel.app）
- **リポジトリ**: wishimura/cursor-ai-recipe-management-mock

## 現在の状態

### 完了済み
- 全17ページ実装済み（ダッシュボード、食材、仕込みレシピ、メニューレシピ、棚卸、原価分析、業者管理、アカウント、料金プラン、LP、ログイン等）
- マルチテナント構造（organizations + profiles + RLS）
- パスワードリセット機能（/reset-password, /reset-password/update）
- プロフィール設定ページ（/profile）
- 組織設定ページ（/settings）
- スマホ対応：ボトムナビゲーション（5タブ + その他メニュー）
- スマホ対応：テーブルのモバイルカード表示
- スマホ対応：フォームの1カラム対応
- サインアップAPIバグ修正（org_id カラム名、email追加、トリガー競合対策）
- エラーメッセージ全て日本語化
- Vercelデプロイ済み（環境変数設定済み）
- PR #1, #2, #3 全てmainにマージ済み

### 未完了（ブロッカー）
- **SupabaseのSQLスキーマが未実行** → テーブルが存在しないためアカウント登録できない
  - SQLファイル: `supabase/schema.sql`
  - 10テーブル + RLSポリシー + サインアップトリガー
  - Supabase SQL Editor で実行する必要がある
  - Supabase MCP ツールが使えれば直接実行可能

### Supabase接続情報
- Project URL: https://ohkxytufylxowygluvgb.supabase.co
- anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oa3h5dHVmeWx4b3d5Z2x1dmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjM3MzEsImV4cCI6MjA4OTk5OTczMX0.AWZHeS4gBa5hw0hObK9o75SMokvsLWq_Z2gDTyiSl0Q
- service_role key: ユーザーに確認（Vercel環境変数には設定済み）

### Vercel環境変数（設定済み）
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## 次にやるべきこと

### 最優先
1. **Supabase MCP ツールを使って `supabase/schema.sql` を実行する**
   - テーブル作成、RLSポリシー、サインアップトリガーが含まれる
   - これが完了しないとアプリが動作しない

### 確認事項
2. アカウント登録のテスト（SQLスキーマ実行後）
3. ログイン→ダッシュボード表示の動作確認

### 今後の改善候補（ユーザーが希望すれば）
- レスポンシブの細かい調整
- Stripe決済連携の本格実装
- 招待メールフローの改善
- 監査ログの追加

## 開発ブランチ
- 作業ブランチ: `claude/complete-recipe-saas-app-HUpbC`
- 全てmainにマージ済み
- 新しい変更は新ブランチを作成してPR→マージの流れで

## 注意事項
- コード内のテキストは全て日本語
- エラーメッセージも全て日本語に統一済み
- Tailwindのカスタムクラス使用（btn-primary, input-field, card, badge-* 等、globals.cssで定義）
