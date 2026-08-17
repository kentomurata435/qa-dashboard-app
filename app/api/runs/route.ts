// app/api/runs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const GITHUB_TIMEOUT_MS = 3000;

const withGithubTimeout = async <T>(operation: () => Promise<T>): Promise<T> => {
  return await Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('GitHub API timeout')), GITHUB_TIMEOUT_MS);
    }),
  ]);
};

// 「作成日時 (createdAt)」の順番で完全固定（テスト実施で順番が変動しない）
const sortRunsByCreationDate = (runs: any[]) => {
  const getCreationTime = (run: any) => {
    const dateStr = run.createdAt;
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 0;

    // 未来日付（サンプルの2026年等）を補正して、新規作成テストを最上部にする
    const now = Date.now();
    if (time > now + 86400000 * 30) {
      return 100000;
    }
    return time;
  };

  return runs.sort((a, b) => getCreationTime(b) - getCreationTime(a));
};

export async function GET() {
  let runs: any[] = [];
  const githubEnabled = !!(process.env.GITHUB_PAT && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);

  if (githubEnabled) {
    try {
      const res = await withGithubTimeout(() => octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        path: 'data/runs',
        ref: process.env.GITHUB_BRANCH || 'main',
        headers: {
          'cache-control': 'no-cache, no-store, must-revalidate',
          'pragma': 'no-cache',
        },
      }));

      if (Array.isArray(res.data)) {
        for (const file of res.data) {
          if (file.name.endsWith('.json')) {
            const fileRes = await withGithubTimeout(() => octokit.repos.getContent({
              owner: process.env.GITHUB_OWNER!,
              repo: process.env.GITHUB_REPO!,
              path: file.path,
              ref: process.env.GITHUB_BRANCH || 'main',
              headers: {
                'cache-control': 'no-cache, no-store, must-revalidate',
                'pragma': 'no-cache',
              },
            }));

            if (!Array.isArray(fileRes.data) && 'content' in fileRes.data) {
              const content = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
              runs.push(JSON.parse(content));
            }
          }
        }

        if (runs.length > 0) {
          return NextResponse.json(sortRunsByCreationDate(runs), {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
          });
        }
      }
    } catch (err) {
      console.warn('GitHub sync unavailable, falling back to local data:', err);
    }
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
    return NextResponse.json(sortRunsByCreationDate(runs), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}