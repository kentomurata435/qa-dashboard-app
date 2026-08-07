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

  useEffect(() => {
    fetchLatestData();
    const interval = setInterval(() => {
      if (saveStatus !== 'saving') {
        fetchLatestData();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [runId, saveStatus, fetchLatestData]);

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
    autoSave(newRunData);
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
    const newRunData = { ...runData, results: newResults };
    setRunData(newRunData);

    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave(newRunData);
    }, 800);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">データを読み込み中...</div>;
  if (!runData || runData.error) return <div className="p-8 text-center text-red-500">対象の実行データが見つかりませんでした</div>;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ヘッダー情報 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{runData.title}</h1>
          <p className="text-sm text-slate-500 mt-1">Run ID: {runData.id} | テスト項目数: {casesData.length} 件</p>
        </div>

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

      {/* テストケーステーブル */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-xs text-slate-600 uppercase font-semibold">
              <th className="p-3 w-20">ID</th>
              <th className="p-3 w-40">画面 / 機能</th>
              <th className="p-3 w-48">前提条件</th>
              <th className="p-3">確認手順</th>
              <th className="p-3">確認内容（期待値）</th>
              <th className="p-3 w-36">結果ステータス</th>
              <th className="p-3 w-48">備考・バグ情報</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {casesData.map((tc: any) => {
              const result = runData.results?.[tc.id] || { status: 'UNTESTED', note: '' };

              return (
                <tr key={tc.id} className="hover:bg-slate-50/80 transition">
                  {/* ID & 重要度 */}
                  <td className="p-3 align-top font-mono">
                    <span className="font-bold text-slate-800">{tc.id}</span>
                    {tc.priority && (
                      <span className={`block mt-1 text-[10px] w-max px-1.5 py-0.5 rounded font-bold ${
                        tc.priority === 'A' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        重要度 {tc.priority}
                      </span>
                    )}
                  </td>

                  {/* 画面 / 機能 */}
                  <td className="p-3 align-top">
                    <div className="font-bold text-slate-800">{tc.screen || '-'}</div>
                    <div className="text-slate-500 mt-0.5">{tc.feature || '-'}</div>
                  </td>

                  {/* 前提条件 */}
                  <td className="p-3 align-top text-slate-600 whitespace-pre-line">
                    {tc.precondition || '-'}
                  </td>

                  {/* 確認手順 */}
                  <td className="p-3 align-top text-slate-800 whitespace-pre-line leading-relaxed">
                    {tc.steps || '-'}
                  </td>

                  {/* 確認内容 */}
                  <td className="p-3 align-top text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                    {tc.expected || '-'}
                  </td>

                  {/* 結果ステータス */}
                  <td className="p-3 align-top">
                    <select
                      value={result.status}
                      onChange={(e) => handleStatusChange(tc.id, e.target.value as any)}
                      className={`w-full p-2 text-xs font-bold rounded-md border cursor-pointer ${
                        result.status === 'PASSED'
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : result.status === 'FAILED'
                          ? 'bg-red-100 border-red-300 text-red-800'
                          : result.status === 'BLOCKED'
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-100 border-slate-300 text-slate-600'
                      }`}
                    >
                      <option value="UNTESTED">UNTESTED</option>
                      <option value="PASSED">PASSED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </td>

                  {/* 備考入力 */}
                  <td className="p-3 align-top">
                    <textarea
                      rows={2}
                      value={result.note || ''}
                      onChange={(e) => handleNoteChange(tc.id, e.target.value)}
                      placeholder="備考・メモ"
                      className="w-full p-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
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