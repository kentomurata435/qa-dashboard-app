// app/api/test-run/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { commitJsonFile } from '@/lib/github';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// GET: 最新の実行データを取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId) return NextResponse.json({ error: 'runIdが指定されていません' }, { status: 400 });

  try {
    const filePath = path.join(process.cwd(), `data/runs/${runId}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'ファイルが存在しません' }, { status: 404 });
    }
    const fileData = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(fileData));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: ローカルファイル更新 ＆ GitHubへCommit & Push
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, data } = body;

    if (!runId || !data) {
      return NextResponse.json({ error: 'runId と data は必須です' }, { status: 400 });
    }

    // 1. ローカルのファイルを即座に書き換え (F5画面更新対策)
    const localPath = path.join(process.cwd(), `data/runs/${runId}.json`);
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf-8');

    // 2. GitHubへCommit & Push
    if (process.env.GITHUB_PAT) {
      const filePath = `data/runs/${runId}.json`;
      const commitMessage = `chore(qa): update test run results for ${runId}`;
      await commitJsonFile(filePath, data, commitMessage);
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