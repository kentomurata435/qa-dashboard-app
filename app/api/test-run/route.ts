// app/api/runs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

export async function GET() {
  const runs: any[] = [];

  // 1. GitHub APIから一覧を取得（Vercel本番環境用）
  if (process.env.GITHUB_PAT && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    try {
      const res = await octokit.repos.getContent({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        path: 'data/runs',
        ref: process.env.GITHUB_BRANCH || 'main',
        headers: { 'cache-control': 'no-cache' }
      });

      if (Array.isArray(res.data)) {
        for (const file of res.data) {
          if (file.name.endsWith('.json')) {
            const fileRes = await octokit.repos.getContent({
              owner: process.env.GITHUB_OWNER,
              repo: process.env.GITHUB_REPO,
              path: file.path,
              ref: process.env.GITHUB_BRANCH || 'main',
              headers: { 'cache-control': 'no-cache' }
            });

            if (!Array.isArray(fileRes.data) && 'content' in fileRes.data) {
              const content = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
              runs.push(JSON.parse(content));
            }
          }
        }
        // 日付順（新しい順）に並び替え
        runs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return NextResponse.json(runs);
      }
    } catch (err) {
      console.warn('GitHubからの全件読み込みをスキップ、ローカルを参照します');
    }
  }

  // 2. ローカルから一覧を取得（ローカルPC開発用）
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
    runs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return NextResponse.json(runs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}