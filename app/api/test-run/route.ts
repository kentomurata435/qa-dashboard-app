// app/api/test-run/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { commitJsonFile } from '@/lib/github';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

// GET: 最新データをGitHub（無ければローカル）から取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId) return NextResponse.json({ error: 'runIdが指定されていません' }, { status: 400 });

  // 1. GitHub APIから最新データを取得を試みる（Vercel環境用）
  if (process.env.GITHUB_PAT && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    try {
      const res = await octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        path: `data/runs/${runId}.json`,
        ref: process.env.GITHUB_BRANCH || 'main',
        headers: { 'cache-control': 'no-cache' }
      });

      if (!Array.isArray(res.data) && 'content' in res.data) {
        const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
        return NextResponse.json(JSON.parse(content));
      }
    } catch (err) {
      console.warn('GitHubからの直接読み込みをスキップ、ローカルを参照します');
    }
  }

  // 2. ローカルファイルから読み込み（ローカルPC開発用）
  try {
    const filePath = path.join(process.cwd(), `data/runs/${runId}.json`);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json(JSON.parse(fileData));
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
}

// POST: GitHubへCommit & Push
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, data } = body;

    if (!runId || !data) {
      return NextResponse.json({ error: 'runId と data は必須です' }, { status: 400 });
    }

    // 1. ローカル書き込み（ローカルPC用。Vercel等のRead-Only環境ではエラーを無視）
    try {
      const localPath = path.join(process.cwd(), `data/runs/${runId}.json`);
      fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      // Vercel上の読み取り専用エラーは無視して進行
    }

    // 2. GitHubへCommit & Push
    if (process.env.GITHUB_PAT) {
      const filePath = `data/runs/${runId}.json`;
      const commitMessage = `chore(qa): update test run results for ${runId}`;
      await commitJsonFile(filePath, data, commitMessage);
    } else {
      throw new Error('GITHUB_PAT が環境変数に設定されていません');
    }

    return NextResponse.json({ success: true, message: '保存が完了しました' });
  } catch (error: any) {
    console.error('Save Error:', error);
    return NextResponse.json(
      { error: error.message || '保存に失敗しました' },
      { status: 500 }
    );
  }
}