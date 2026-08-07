'use client';

import { useState, useEffect } from 'react';
import casesData from '@/data/cases.json';

interface TestResult {
  status: 'UNTESTED' | 'PASSED' | 'FAILED' | 'BLOCKED';
  note: string;
  updatedAt: string;
}

export default function RunPage({ params }: { params: { runId: string } }) {
  const { runId } = params;
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // クライアント側でJSONデータを動的に取得 (初期状態)
    import(`@/data/runs/${runId}.json`)
      .then((data) => {
        setRunData(data.default || data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [runId]);

  const handleStatusChange = (caseId: string, status: TestResult['status']) => {
    if (!runData) return;
    const newResults = {
      ...runData.results,
      [caseId]: {
        ...runData.results[caseId],
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    setRunData({ ...runData, results: newResults });
  };

  const handleNoteChange = (caseId: string, note: string) => {
    if (!runData) return;
    const newResults = {
      ...runData.results,
      [caseId]: {
        ...runData.results[caseId],
        note,
        updatedAt: new Date().toISOString(),
      },
    };
    setRunData({ ...runData, results: newResults });
  };

  const handleSaveToGithub = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          data: {
            ...runData,
            updatedAt: new Date().toISOString(),
          },
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'GitHubへのCommit & Pushが成功しました！' });
      } else {
        throw new Error(resData.error || '保存に失敗しました');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">データを読み込み中...</div>;
  if (!runData) return <div className="p-8 text-center text-red-500">対象の実行データが見つかりませんでした ({runId}.json)</div>;

  return (
    <div className="space-y-6">
      {/* ヘッダー情報 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{runData.title}</h1>
          <p className="text-sm text-slate-500 mt-1">Run ID: {runData.id}</p>
        </div>
        <button
          onClick={handleSaveToGithub}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {saving ? 'GitHubへ保存中...' : 'GitHubへ結果を保存'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* テストケース一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <th className="p-4">ID / カテゴリ</th>
              <th className="p-4">テストケース内容</th>
              <th className="p-4 w-48">ステータス</th>
              <th className="p-4">メモ / バグ情報</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {casesData.map((tc) => {
              const result = runData.results?.[tc.id] || { status: 'UNTESTED', note: '' };

              return (
                <tr key={tc.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 align-top">
                    <span className="font-mono font-bold text-slate-700">{tc.id}</span>
                    <span className="block text-xs text-slate-400 mt-1">{tc.category}</span>
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-semibold text-slate-800">{tc.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{tc.description}</div>
                  </td>
                  <td className="p-4 align-top">
                    <select
                      value={result.status}
                      onChange={(e) => handleStatusChange(tc.id, e.target.value as any)}
                      className={`w-full p-2 text-xs font-bold rounded-md border ${
                        result.status === 'PASSED'
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : result.status === 'FAILED'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : result.status === 'BLOCKED'
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-slate-100 border-slate-300 text-slate-600'
                      }`}
                    >
                      <option value="UNTESTED">UNTESTED</option>
                      <option value="PASSED">PASSED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </td>
                  <td className="p-4 align-top">
                    <input
                      type="text"
                      value={result.note || ''}
                      onChange={(e) => handleNoteChange(tc.id, e.target.value)}
                      placeholder="備考・不具合リンクなど"
                      className="w-full p-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}