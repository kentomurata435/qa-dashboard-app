// app/api/runs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

// 新しく追加・更新されたテストが必ず一番上に来る強力ソート
const sortRunsNewestFirst = (runs: any[]) => {
  const getRunTime = (run: any) => {
    const dateStr = run.updatedAt || run.createdAt;
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 0;

    // 未来日付（サンプルデータの2026年）を過去扱いにして新作成テストを一番上にする調整
    const now = Date.now();
    if (time > now + 86400000 * 30) {
      return 100000;
    }
    return time;
  };

  return runs.sort((a, b) => getRunTime(b) - getRunTime(a));
};

export async function GET() {
  let runs: any[] = [];

  if (process.env.GITHUB_PAT && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    try {
      const res = await octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        path: 'data/runs',
        ref: process.env.GITHUB_BRANCH || 'main',
        headers: {
          'cache-control': 'no-cache, no-store, must-revalidate',
          'pragma': 'no-cache',
        },
      });

      if (Array.isArray(res.data)) {
        for (const file of res.data) {
          if (file.name.endsWith('.json')) {
            const fileRes = await octokit.repos.getContent({
              owner: process.env.GITHUB_OWNER,
              repo: process.env.GITHUB_REPO,
              path: file.path,
              ref: process.env.GITHUB_BRANCH || 'main',
              headers: {
                'cache-control': 'no-cache, no-store, must-revalidate',
                'pragma': 'no-cache',
              },
            });

            if (!Array.isArray(fileRes.data) && 'content' in fileRes.data) {
              const content = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
              runs.push(JSON.parse(content));
            }
          }
        }
        return NextResponse.json(sortRunsNewestFirst(runs), {
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
      }
    } catch (err) {}
  }

  try {
    const runsDir = path.join(process.cwd(), 'data/runs');
    if (fs.existsSync(runsDir)) {
      const files = fs.readdirSync(runsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(runsDir, file), 'utf-8');
          runs.push(JSON.parse(content));
        }
      }
    }
    return NextResponse.json(sortRunsNewestFirst(runs), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}