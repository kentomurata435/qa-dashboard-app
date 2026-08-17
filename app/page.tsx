// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import casesData from '@/data/cases.json';

export default function HomePage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規作成モーダル用
  const [showModal, setShowModal] = useState(false);
  const [newRunId, setNewRunId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/runs?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        const getCreationTime = (run: any) => {
          const dateStr = run.createdAt;
          if (!dateStr) return 0;
          const time = new Date(dateStr).getTime();
          if (isNaN(time)) return 0;

          const now = Date.now();
          if (time > now + 86400000 * 30) {
            return 100000;
          }
          return time;
        };

        data.sort((a, b) => getCreationTime(b) - getCreationTime(a));
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

  const handleDeleteRun = async (runId: string, title: string) => {
    if (!confirm(`「${title}」を本当に削除しますか？\n（GitHub上のデータも削除されます）`)) return;

    try {
      const res = await fetch(`/api/test-run?runId=${runId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('テスト項目書を削除しました。');
        fetchRuns();
      } else {
        alert('削除に失敗しました。');
      }
    } catch (err) {
      alert('エラーが発生しました。');
    }
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-16 px-4">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-5 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">スルーテスト項目書 一覧</h1>
          <p className="text-xs text-slate-500 mt-1">テストケースマスタを管理</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg shadow transition text-xs flex items-center gap-1.5 w-max"
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

      {/* テストカード一覧 */}
      {!loading && runs.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {runs.map((run: any) => {
            const total = casesData.length;

            let ok = 0, ng = 0, blocked = 0, excluded = 0, automated = 0;

            casesData.forEach((tc: any) => {
              const status = run.results?.[tc.id]?.status || 'UNTESTED';
              if (status === 'PASSED') ok++;
              else if (status === 'FAILED') ng++;
              else if (status === 'BLOCKED') blocked++;
              else if (status === 'EXCLUDED') excluded++;
              else if (status === 'AUTOMATED') automated++;
            });

            const untested = total - (ok + ng + blocked + excluded + automated);
            const progress = total > 0 ? Math.round(((total - untested) / total) * 100) : 0;

            return (
              <div
                key={run.id}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  {/* 1. タイトル ＆ 削除ボタン */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: '1.4' }}>
                      {run.title}
                    </h2>
                    <button
                      onClick={() => handleDeleteRun(run.id, run.title)}
                      title="削除する"
                      style={{
                        border: '1px solid #fecdd3',
                        backgroundColor: '#fff1f2',
                        color: '#e11d48',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      🗑️ 削除
                    </button>
                  </div>

                  {/* 2. タイトルの下に ID と 進捗 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      ID: {run.id}
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #dbeafe' }}>
                      進捗 {progress}%
                    </span>
                  </div>

                  {/* 3. 進捗バー */}
                  <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '8px', borderRadius: '9999px', overflow: 'hidden', display: 'flex', marginTop: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: `${total ? (ok / total) * 100 : 0}%`, backgroundColor: '#10b981' }} />
                    <div style={{ width: `${total ? (ng / total) * 100 : 0}%`, backgroundColor: '#ef4444' }} />
                    <div style={{ width: `${total ? (blocked / total) * 100 : 0}%`, backgroundColor: '#f59e0b' }} />
                    <div style={{ width: `${total ? (automated / total) * 100 : 0}%`, backgroundColor: '#3b82f6' }} />
                    <div style={{ width: `${total ? (excluded / total) * 100 : 0}%`, backgroundColor: '#94a3b8' }} />
                  </div>

                  {/* 4. 6区分内訳 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '10px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '10px' }}>
                    <div><span style={{ display: 'block', fontWeight: 'bold', color: '#64748b', fontSize: '12px' }}>{untested}</span>未実施</div>
                    <div><span style={{ display: 'block', fontWeight: 'bold', color: '#059669', fontSize: '12px' }}>{ok}</span>OK</div>
                    <div><span style={{ display: 'block', fontWeight: 'bold', color: '#dc2626', fontSize: '12px' }}>{ng}</span>NG</div>
                    <div><span style={{ display: 'block', fontWeight: 'bold', color: '#d97706', fontSize: '12px' }}>{blocked}</span>保留</div>
                    <div><span style={{ display: 'block', fontWeight: 'bold', color: '#475569', fontSize: '12px' }}>{excluded}</span>対象外</div>
                    <div><span style={{ display: 'block', fontWeight: 'bold', color: '#2563eb', fontSize: '12px' }}>{automated}</span>自動化</div>
                  </div>
                </div>

                {/* 5. 開くボタン */}
                <Link
                  href={`/runs/${run.id}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    padding: '8px 0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    textDecoration: 'none',
                    marginTop: '8px'
                  }}
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