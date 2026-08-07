// app/api/test-run/route.ts
import { NextRequest, NextResponse } from 'next/server';
import casesData from '@/data/cases.json';
import { commitJsonFile } from '@/lib/github';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

// GET: 単一データの取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId) return NextResponse.json({ error: 'runIdが指定されていません' }, { status: 400 });

  if (process.env.GITHUB_PAT && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    try {
      const res = await octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        path: `data/runs/${runId}.json`,
        ref: process.env.GITHUB_BRANCH || 'main',
        headers: { 'cache-control': 'no-cache, no-store, must-revalidate' }
      });

      if (!Array.isArray(res.data) && 'content' in res.data) {
        const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
        return NextResponse.json(JSON.parse(content), {
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
      }
    } catch (err) {}
  }

  try {
    const filePath = path.join(process.cwd(), `data/runs/${runId}.json`);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json(JSON.parse(fileData), {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }
  } catch (err: any) {}

  return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
}

// POST: 「新規作成」と「既存更新」
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, runId, title, data } = body;

    if (action === 'create') {
      if (!runId || !title) {
        return NextResponse.json({ error: 'runId と title は必須です' }, { status: 400 });
      }

      const sanitizedRunId = runId
        .replace(/[^\w-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const initialResults: Record<string, any> = {};
      casesData.forEach((tc: any) => {
        initialResults[tc.id] = {
          status: 'UNTESTED',
          tester: tc.defaultTester || '',
          note: '',
          updatedAt: '',
        };
      });

      const newRunData = {
        id: sanitizedRunId,
        title: title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        results: initialResults,
      };

      try {
        fs.writeFileSync(path.join(process.cwd(), `data/runs/${sanitizedRunId}.json`), JSON.stringify(newRunData, null, 2));
      } catch (e) {}

      if (process.env.GITHUB_PAT) {
        await commitJsonFile(`data/runs/${sanitizedRunId}.json`, newRunData, `chore(qa): create test run ${sanitizedRunId}`);
      } else {
        return NextResponse.json({ error: 'GITHUB_PAT環境変数がVercelに設定されていません' }, { status: 500 });
      }

      return NextResponse.json({ success: true, runId: sanitizedRunId });
    }

    if (!runId || !data) {
      return NextResponse.json({ error: 'runId と data は必須です' }, { status: 400 });
    }

    try {
      fs.writeFileSync(path.join(process.cwd(), `data/runs/${runId}.json`), JSON.stringify(data, null, 2));
    } catch (e) {}

    if (process.env.GITHUB_PAT) {
      await commitJsonFile(`data/runs/${runId}.json`, data, `chore(qa): update test run ${runId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '処理に失敗しました' }, { status: 500 });
  }
}

// DELETE: テスト項目書の削除処理
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId) return NextResponse.json({ error: 'runIdが指定されていません' }, { status: 400 });

  // 1. ローカル削除
  try {
    const localPath = path.join(process.cwd(), `data/runs/${runId}.json`);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } catch (e) {}

  // 2. GitHubから削除
  if (process.env.GITHUB_PAT && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    try {
      const fileInfo = await octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        path: `data/runs/${runId}.json`,
        ref: process.env.GITHUB_BRANCH || 'main',
      });

      if (!Array.isArray(fileInfo.data) && 'sha' in fileInfo.data) {
        await octokit.repos.deleteFile({
          owner: process.env.GITHUB_OWNER,
          repo: process.env.GITHUB_REPO,
          path: `data/runs/${runId}.json`,
          message: `chore(qa): delete test run ${runId}`,
          sha: fileInfo.data.sha,
          branch: process.env.GITHUB_BRANCH || 'main',
        });
      }
    } catch (err) {
      console.error('GitHub delete error:', err);
    }
  }

  return NextResponse.json({ success: true });
}