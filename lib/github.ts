import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

const OWNER = process.env.GITHUB_OWNER || '';
const REPO = process.env.GITHUB_REPO || '';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

/**
 * 指定したファイルパスの内容をGitHubから取得、または更新・新規作成（Commit&Push）する
 */
export async function commitJsonFile(filePath: string, contentObj: any, commitMessage: string) {
  if (!process.env.GITHUB_PAT || !OWNER || !REPO) {
    throw new Error('GitHub環境変数が設定されていません。');
  }

  const contentString = JSON.stringify(contentObj, null, 2);
  const contentEncoded = Buffer.from(contentString).toString('base64');

  let sha: string | undefined = undefined;

  // 既存ファイルのSHAを取得（更新時に必要）
  try {
    const existingFile = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: BRANCH,
    });

    if (!Array.isArray(existingFile.data) && 'sha' in existingFile.data) {
      sha = existingFile.data.sha;
    }
  } catch (error: any) {
    if (error.status !== 404) {
      throw error;
    }
    // 404の場合は新規作成扱い
  }

  // ファイルのCommit & Push
  const response = await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: filePath,
    message: commitMessage,
    content: contentEncoded,
    sha: sha,
    branch: BRANCH,
  });

  return response.data;
}
