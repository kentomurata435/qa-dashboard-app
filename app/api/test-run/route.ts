import { NextRequest, NextResponse } from 'next/server';
import { commitJsonFile } from '@/lib/github';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, data } = body;

    if (!runId || !data) {
      return NextResponse.json({ error: 'runId と data は必須です' }, { status: 400 });
    }

    const filePath = `data/runs/${runId}.json`;
    const commitMessage = `chore(qa): update test run results for ${runId}`;

    await commitJsonFile(filePath, data, commitMessage);

    return NextResponse.json({ success: true, message: 'GitHubへの保存が完了しました' });
  } catch (error: any) {
    console.error('GitHub Commit Error:', error);
    return NextResponse.json(
      { error: error.message || 'GitHubへの保存に失敗しました' },
      { status: 500 }
    );
  }
}
