// app/runs/[runId]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import casesData from '@/data/cases.json';

interface TestResult {
  status: 'UNTESTED' | 'PASSED' | 'FAILED' | 'BLOCKED';
  tester: string;
  note: string;
  updatedAt: string;
}

export default function RunPage({ params }: { params: { runId: string } }) {
  const { runId } = params;
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchTester, setBatchTester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
      if (saveStatus !== 'saving') fetchLatestData();
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
      if (res.ok) setSaveStatus('saved');
      else setSaveStatus('error');
    } catch (err) {
      setSaveStatus('error');
    }
  }, [runId]);

  const updateResult = (caseId: string, fields: Partial<TestResult>, immediate = true) => {
    if (!runData) return;
    const current = runData.results?.[caseId] || { status: 'UNTESTED', tester: '', note: '' };
    const newResults = {
      ...runData.results,
      [caseId]: {
        ...current,
        ...fields,
        updatedAt: new Date().toISOString(),
      },
    };
    const newRunData = { ...runData, results: newResults };
    setRunData(newRunData);

    if (immediate) {
      autoSave(newRunData);
    } else {
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => autoSave(newRunData), 800);
    }
  };

  const handleBatchApplyTester = () => {
    if (selectedIds.size === 0 || !batchTester.trim()) return;
    const newResults = { ...runData.results };
    selectedIds.forEach((id) => {
      const current = newResults[id] || { status: 'UNTESTED', note: '' };
      newResults[id] = {
        ...current,
        tester: batchTester.trim(),
        updatedAt: new Date().toISOString(),
      };
    });
    const newRunData = { ...runData, results: newResults };
    setRunData(newRunData);
    autoSave(newRunData);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = (filteredCases: any[]) => {
    if (selectedIds.size === filteredCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCases.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">データを読み込み中...</div>;
  if (!runData || runData.error) return <div className="p-8 text-center text-red-500">データが見つかりませんでした</div>;

  const filteredCases = casesData.filter((tc: any) => {
    const result = runData.results?.[tc.id] || {};
    const matchesSearch =
      tc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.screen.includes(searchQuery) ||
      tc.feature.includes(searchQuery) ||
      tc.steps.includes(searchQuery) ||
      (result.tester && result.tester.includes(searchQuery));

    const matchesStatus =
      statusFilter === 'ALL' || (result.status || 'UNTESTED') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12">
      {/* ヘッダー情報 */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{runData.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Run ID: <span className="font-mono text-slate-700">{runData.id}</span> | 全 {casesData.length} 件 (表示中: {filteredCases.length} 件)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          {saveStatus === 'saving' && (
            <span className="flex items-center text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 animate-pulse">
              🔄 自動保存中...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              ✓ クラウド（GitHub）保存済み
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
              ⚠️ 保存エラー
            </span>
          )}
        </div>
      </div>

      {/* 検索・一括操作ツールバー */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 検索 (ID, 画面, 機能, 実施者...)"
              className="w-full max-w-xs px-3 py-1.5 text-xs text-slate-900 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs text-slate-900 rounded-lg bg-white border border-slate-300 font-semibold focus:outline-none"
            >
              <option value="ALL">すべてのステータス</option>
              <option value="UNTESTED">UNTESTED (未実施)</option>
              <option value="PASSED">PASSED (合格)</option>
              <option value="FAILED">FAILED (不合格)</option>
              <option value="BLOCKED">BLOCKED (保留)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
            <span className="text-xs text-slate-300">
              選択中: <strong className="text-blue-400">{selectedIds.size}</strong> 件
            </span>
            <input
              type="text"
              value={batchTester}
              onChange={(e) => setBatchTester(e.target.value)}
              placeholder="実施者名 (例: 村田)"
              className="px-2.5 py-1.5 text-xs text-slate-900 rounded bg-white w-32 focus:outline-none"
            />
            <button
              onClick={handleBatchApplyTester}
              disabled={selectedIds.size === 0 || !batchTester.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded font-bold transition shadow-sm"
            >
              一括適用
            </button>
          </div>
        </div>
      </div>

      {/* メインテーブル（格子枠線付き） */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-100 text-[11px] text-slate-700 font-bold uppercase border-b border-slate-300">
                <th className="p-2.5 border-r border-slate-300 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredCases.length}
                    onChange={() => toggleSelectAll(filteredCases)}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th className="p-2.5 border-r border-slate-300 w-24">ID</th>
                <th className="p-2.5 border-r border-slate-300 w-40">画面 / 機能</th>
                <th className="p-2.5 border-r border-slate-300 w-52">前提条件</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[280px]">確認手順</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[280px]">確認内容（期待値）</th>
                <th className="p-2.5 border-r border-slate-300 w-28 bg-blue-50/80 text-blue-900">実施者</th>
                <th className="p-2.5 border-r border-slate-300 w-36">結果ステータス</th>
                <th className="p-2.5 w-44">備考・バグ情報</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredCases.map((tc: any) => {
                const result = runData.results?.[tc.id] || {
                  status: 'UNTESTED',
                  tester: tc.defaultTester || '',
                  note: '',
                };
                const isSelected = selectedIds.has(tc.id);

                return (
                  <tr
                    key={tc.id}
                    className={`hover:bg-blue-50/40 transition border-b border-slate-200 ${
                      isSelected ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    {/* チェックボックス */}
                    <td className="p-2.5 text-center align-top border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(tc.id)}
                        className="rounded cursor-pointer mt-0.5"
                      />
                    </td>

                    {/* ID */}
                    <td className="p-2.5 align-top font-mono border-r border-slate-200">
                      <span className="font-bold text-slate-800">{tc.id}</span>
                      {tc.priority && (
                        <span className={`block mt-1 text-[10px] w-max px-1.5 py-0.2 rounded font-bold ${
                          tc.priority === 'A' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          重要度 {tc.priority}
                        </span>
                      )}
                    </td>

                    {/* 画面 / 機能 */}
                    <td className="p-2.5 align-top border-r border-slate-200">
                      <div className="font-bold text-slate-800">{tc.screen || '-'}</div>
                      <div className="text-slate-500 mt-0.5">{tc.feature || '-'}</div>
                    </td>

                    {/* 前提条件（改行対応） */}
                    <td className="p-2.5 align-top border-r border-slate-200 text-slate-600 whitespace-pre-wrap break-words leading-relaxed font-sans">
                      {tc.precondition || '-'}
                    </td>

                    {/* 確認手順（改行対応） */}
                    <td className="p-2.5 align-top border-r border-slate-200 text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-sans">
                      {tc.steps || '-'}
                    </td>

                    {/* 確認内容（改行対応） */}
                    <td className="p-2.5 align-top border-r border-slate-200 text-slate-900 font-medium whitespace-pre-wrap break-words leading-relaxed font-sans">
                      {tc.expected || '-'}
                    </td>

                    {/* 実施者 */}
                    <td className="p-2.5 align-top border-r border-slate-200 bg-blue-50/20">
                      <input
                        type="text"
                        value={result.tester || ''}
                        onChange={(e) => updateResult(tc.id, { tester: e.target.value }, false)}
                        placeholder="担当者名"
                        className="w-full p-1.5 text-xs border border-slate-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </td>

                    {/* 結果ステータス */}
                    <td className="p-2.5 align-top border-r border-slate-200">
                      <select
                        value={result.status || 'UNTESTED'}
                        onChange={(e) => updateResult(tc.id, { status: e.target.value as any }, true)}
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

                    {/* 備考 */}
                    <td className="p-2.5 align-top">
                      <textarea
                        rows={2}
                        value={result.note || ''}
                        onChange={(e) => updateResult(tc.id, { note: e.target.value }, false)}
                        placeholder="備考・不具合リンク"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y bg-white"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}