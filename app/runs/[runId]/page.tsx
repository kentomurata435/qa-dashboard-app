// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // モーダル用 State
  const [showModal, setShowModal] = useState(false);
  const [newRunId, setNewRunId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // 全テスト一覧を取得
  const fetchRuns = async () => {
    try {
      const res = await fetch(`/api/runs?t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRuns(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const today = new Date().toISOString().split('T')[0];
    setNewRunId(`${today}-stg`);
    setNewTitle(`${today} STG環境 スルーテスト`);
  }, []);

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/create-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: newRunId, title: newTitle }),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`サーバーエラーが発生しました (${res.status})。実行IDにカッコなどの特殊文字が含まれていないか確認してください。`);
      }

      if (res.ok && data.success) {
        alert('新しいスルーテスト項目書を作成しました！');
        window.location.href = `/runs/${data.runId}`;
      } else {
        alert(`作成失敗: ${data.error || 'エラーが発生しました'}`);
      }
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">スルーテスト項目書 一覧</h1>
          <p className="text-sm text-slate-500 mt-1">実施回ごとのテスト管理・結果の確認ができます</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition text-sm flex items-center gap-2"
        >
          <span>＋</span> 新規スルーテストを作成
        </button>
      </div>

      {/* 新規作成モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">新規スルーテストの作成</h2>
            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  実行ID（英数字・ハイフン推奨）
                </label>
                <input
                  type="text"
                  required
                  value={newRunId}
                  onChange={(e) => setNewRunId(e.target.value)}
                  placeholder="例: 2026-08-23-dev-Test"
                  className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">※カッコや特殊文字は自動でハイフンに変換されます</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">テストタイトル</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: 2026/08/23 DEV環境 スルーテスト"
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? '作成中...' : '作成してテスト開く'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ローディング表示 */}
      {loading && <div className="p-12 text-center text-slate-500 font-medium">テスト一覧を読み込み中...</div>}

      {/* テストカード一覧 */}
      {!loading && runs.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          テスト項目書がまだありません。右上の「＋ 新規スルーテストを作成」から作成してください。
        </div>
      )}

      {!loading && runs.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {runs.map((run: any) => {
            const resultsList = Object.values(run.results || {}) as any[];
            const total = resultsList.length;
            const passed = resultsList.filter((r) => r.status === 'PASSED').length;
            const failed = resultsList.filter((r) => r.status === 'FAILED').length;
            const blocked = resultsList.filter((r) => r.status === 'BLOCKED').length;
            const untested = total - (passed + failed + blocked);

            const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;

            return (
              <div
                key={run.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      ID: {run.id}
                    </span>
                    <span className="text-[11px] font-bold text-blue-600">進捗: {progress}%</span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-snug mb-3">{run.title}</h2>

                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex mb-3 border border-slate-200">
                    <div className="bg-emerald-500 h-full" style={{ width: `${total ? (passed / total) * 100 : 0}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${total ? (failed / total) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${total ? (blocked / total) * 100 : 0}%` }} />
                  </div>

                  <div className="grid grid-cols-4 text-center text-[11px] font-semibold bg-slate-50 p-2 rounded-lg mb-4 border border-slate-100">
                    <div><span className="text-emerald-700 block text-xs font-bold">{passed}</span>Pass</div>
                    <div><span className="text-red-700 block text-xs font-bold">{failed}</span>Fail</div>
                    <div><span className="text-amber-700 block text-xs font-bold">{blocked}</span>Hold</div>
                    <div><span className="text-slate-500 block text-xs font-bold">{untested}</span>未実施</div>
                  </div>
                </div>

                <Link
                  href={`/runs/${run.id}`}
                  className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm"
                >
                  このテストを開いて実施 →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}