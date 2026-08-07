// app/api/create-run/route.ts
import { NextRequest, NextResponse } from 'next/server';
import casesData from '@/data/cases.json';
import { commitJsonFile } from '@/lib/github';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { runId, title } = body;

    if (!runId || !title) {
      return NextResponse.json({ error: 'runId と title は必須です' }, { status: 400 });
    }

    // 実行IDの安全化（カッコや全角、特殊文字をハイフンに自動変換）
    const sanitizedRunId = runId
      .replace(/[^\w-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!sanitizedRunId) {
      return NextResponse.json({ error: '実行IDに有効な英数字が含まれていません' }, { status: 400 });
    }

    // 全テストケースを UNTESTED 状態で初期化
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

    // 1. ローカル書き込み（ローカル開発用）
    try {
      const localPath = path.join(process.cwd(), `data/runs/${sanitizedRunId}.json`);
      fs.writeFileSync(localPath, JSON.stringify(newRunData, null, 2), 'utf-8');
    } catch (e) {}

    // 2. GitHubへCommit & Push
    if (process.env.GITHUB_PAT) {
      const filePath = `data/runs/${sanitizedRunId}.json`;
      const commitMessage = `chore(qa): create new test run ${sanitizedRunId}`;
      await commitJsonFile(filePath, newRunData, commitMessage);
    } else {
      return NextResponse.json({ error: 'GITHUB_PAT環境変数がVercelに設定されていません' }, { status: 500 });
    }

    return NextResponse.json({ success: true, runId: sanitizedRunId });
  } catch (error: any) {
    console.error('Create Run Error:', error);
    return NextResponse.json({ error: error.message || '作成に失敗しました' }, { status: 500 });
  }
}