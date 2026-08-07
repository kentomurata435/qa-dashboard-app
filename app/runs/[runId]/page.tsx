// app/runs/[runId]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 最新データの取得
  const fetchLatestData = useCallback(() => {
    fetch(`/api/test-run?runId=${runId}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        setRunData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [runId]);

  // 初回読み込み & 10秒ごとの自動同期（複数人での同期用）
  useEffect(() => {
    fetchLatestData();
    const interval = setInterval(() => {
      // 自分が保存中でない場合のみバックグラウンドで最新データに更新
      if (saveStatus !== 'saving') {
        fetchLatestData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [runId, saveStatus, fetchLatestData]);

  // 2. 自動保存API呼び出し
  const autoSave = useCallback(async (updatedData: any) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          data: {
            ...updatedData,
            updatedAt: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }, [runId]);

  // 3. ステータス変更（即時自動保存）
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
    const newRunData = { ...runData, results: newResults };
    setRunData(newRunData);
    autoSave(newRunData); // 即時保存
  };

  // 4. メモ変更（タイマーによる自動保存）
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
    const newRunData = { ...runData, results: newResults };
    setRunData(newRunData);

    // 入力が止まってから0.8秒後に自動保存
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave(newRunData);
    }, 800);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">データを読み込み中...</div>;
  if (!runData || runData.error) return <div className="p-8 text-center text-red-500">対象の実行データが見つかりませんでした</div>;

  return (
    <div className="space-y-6">
      {/* ヘッダー＆保存ステータス表示 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{runData.title}</h1>
          <p className="text-sm text-slate-500 mt-1">Run ID: {runData.id}</p>
        </div>

        {/* リアルタイム保存インジケーター */}
        <div className="flex items-center gap-2 text-sm font-medium">
          {saveStatus === 'saving' && (
            <span className="flex items-center text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <span className="animate-spin mr-2">🔄</span> 自動保存中...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              ✓ クラウド（GitHub）に保存済み
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
              ⚠️ 保存エラーが発生しました
            </span>
          )}
        </div>
      </div>

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
            {casesData.map((tc: any) => {
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
                      className={`w-full p-2 text-xs font-bold rounded-md border cursor-pointer transition ${
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