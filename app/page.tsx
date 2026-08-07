// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規作成モーダル用
  const [showModal, setShowModal] = useState(false);
  const [newRunId, setNewRunId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // 全テスト取得（最新順に並び替え）
  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/runs?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        // 新しい順（作成日時降順）にソート
        data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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

  // 新規作成処理
  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          runId: newRunId,
          title: newTitle,
        }),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`サーバーエラー (${res.status})。時間をおいて再試行してください。`);
      }

      if (res.ok && data.success) {
        alert('新しいスルーテスト項目書を作成しました！\n（GitHubへ反映中...数秒後にテスト画面に移動します）');
        setShowModal(false);
        setTimeout(() => {
          window.location.href = `/runs/${data.runId}`;
        }, 2000);
      } else {
        alert(`作成失敗: ${data.error || 'エラーが発生しました'}`);
      }
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // テスト削除処理
  const handleDeleteRun = async (runId: string, title: string) => {
    if (!confirm(`「${title}」を本当に削除しますか？\n（GitHub上のデータも削除されます）`)) return;

    try {
      const res = await fetch(`/api/test-run?runId=${runId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('テスト項目書を削除しました。');
        fetchRuns(); // 一覧更新
      } else {
        alert('削除に失敗しました。');
      }
    } catch (err) {
      alert('エラーが発生しました。');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 px-4">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">スルーテスト項目書 一覧</h1>
          <p className="text-xs text-slate-500 mt-1">実施回ごとのテスト管理・結果の確認ができます</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow transition text-xs flex items-center gap-1.5 w-max"
        >
          <span className="text-sm">＋</span> 新規スルーテストを作成
        </button>
      </div>

      {/* 新規作成モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">新規スルーテストの作成</h2>
            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  実行ID（英数字・ハイフン）
                </label>
                <input
                  type="text"
                  required
                  value={newRunId}
                  onChange={(e) => setNewRunId(e.target.value)}
                  placeholder="例: 2026-08-23-dev"
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">テストタイトル</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: 2026/08/23 DEV環境 スルーテスト"
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? '作成中...' : '作成してテスト開く'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ローディング表示 */}
      {loading && (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-xl border border-slate-200 text-xs">
          🔄 テスト一覧をリアルタイム読み込み中...
        </div>
      )}

      {/* 一覧が空の場合 */}
      {!loading && runs.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
          <p className="text-sm font-bold text-slate-700">テスト項目書がまだありません</p>
          <p className="text-xs">右上の「＋ 新規スルーテストを作成」から最初のテスト項目書を作成してください。</p>
        </div>
      )}

      {/* テストカード一覧（最新順） */}
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
                className="bg-white rounded-xl shadow-sm border border-slate-300 p-5 hover:shadow transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* ID & 進捗バッジ */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      ID: {run.id}
                    </span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      進捗 {progress}%
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="text-sm font-bold text-slate-900 leading-snug">{run.title}</h2>

                  {/* 進捗プログレスバー */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex border border-slate-200">
                    <div className="bg-emerald-500 h-full" style={{ width: `${total ? (passed / total) * 100 : 0}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${total ? (failed / total) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${total ? (blocked / total) * 100 : 0}%` }} />
                  </div>

                  {/* 内訳数字 */}
                  <div className="grid grid-cols-4 text-center text-[10px] font-semibold bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div><span className="text-emerald-700 block text-xs font-bold">{passed}</span>Pass</div>
                    <div><span className="text-red-700 block text-xs font-bold">{failed}</span>Fail</div>
                    <div><span className="text-amber-700 block text-xs font-bold">{blocked}</span>Hold</div>
                    <div><span className="text-slate-500 block text-xs font-bold">{untested}</span>未実施</div>
                  </div>
                </div>

                {/* ボタンエリア */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href={`/runs/${run.id}`}
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm"
                  >
                    このテストを開いて実施 →
                  </Link>
                  <button
                    onClick={() => handleDeleteRun(run.id, run.title)}
                    title="このテスト項目書を削除"
                    className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}