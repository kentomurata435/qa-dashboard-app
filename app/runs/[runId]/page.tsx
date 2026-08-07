// app/runs/[runId]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import casesData from '@/data/cases.json';

interface TestResult {
  status: 'UNTESTED' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'EXCLUDED' | 'AUTOMATED';
  tester: string;
  note: string;
  updatedAt: string;
}

const ALL_STATUSES = [
  { key: 'UNTESTED', label: '未実施', color: 'bg-slate-100 text-slate-700' },
  { key: 'PASSED', label: 'OK', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'FAILED', label: 'NG', color: 'bg-rose-100 text-rose-800' },
  { key: 'BLOCKED', label: '保留', color: 'bg-amber-100 text-amber-800' },
  { key: 'EXCLUDED', label: '対象外', color: 'bg-slate-200 text-slate-700' },
  { key: 'AUTOMATED', label: '自動化', color: 'bg-blue-100 text-blue-800' },
];

export default function RunPage({ params }: { params: { runId: string } }) {
  const { runId } = params;
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 選択・検索
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchTester, setBatchTester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ステータス複数選択フィルター State (初期値はすべてON)
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(['UNTESTED', 'PASSED', 'FAILED', 'BLOCKED', 'EXCLUDED', 'AUTOMATED'])
  );

  // 列幅可変サイズ
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    check: 40,
    id: 90,
    priority: 80,
    screen: 150,
    precondition: 220,
    steps: 320,
    expected: 320,
    tester: 120,
    status: 130,
    note: 200,
  });

  const startResizing = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + (moveEvent.clientX - startX));
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const fetchLatestData = useCallback((retryCount = 0) => {
    fetch(`/api/test-run?runId=${runId}&t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setRunData(data);
          setLoading(false);
        } else if (retryCount < 5) {
          setTimeout(() => fetchLatestData(retryCount + 1), 1500);
        } else {
          setRunData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (retryCount < 5) {
          setTimeout(() => fetchLatestData(retryCount + 1), 1500);
        } else {
          setLoading(false);
        }
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
 
  const normalizeStatus = (input: string): TestResult['status'] | undefined => {
    const normalized = input.trim().replace(/\u3000/g, ' ').toLowerCase();
    const statusMap: Record<string, TestResult['status']> = {
      untested: 'UNTESTED', '未実施': 'UNTESTED',
      passed: 'PASSED', ok: 'PASSED', 合格: 'PASSED', pass: 'PASSED',
      failed: 'FAILED', ng: 'FAILED', 不合格: 'FAILED', fail: 'FAILED',
      blocked: 'BLOCKED', 保留: 'BLOCKED',
      excluded: 'EXCLUDED', 対象外: 'EXCLUDED',
      automated: 'AUTOMATED', 自動化: 'AUTOMATED',
    };
    return statusMap[normalized];
  };
 
  const parsePasteRow = (
    cells: string[],
    startField: 'tester' | 'status'
  ): Partial<Pick<TestResult, 'tester' | 'status'>> => {
    const values = cells.map((cell) => cell.trim()).filter((value) => value.length > 0);
    if (values.length === 0) return {};
 
    const firstStatus = normalizeStatus(values[0]);
    const secondStatus = values.length > 1 ? normalizeStatus(values[1]) : undefined;
 
    if (startField === 'tester') {
      if (values.length === 1) {
        return { tester: values[0] };
      }
      if (firstStatus && !secondStatus) {
        return { status: firstStatus, tester: values[1] };
      }
      return {
        tester: values[0],
        ...(secondStatus ? { status: secondStatus } : {}),
      };
    }
 
    if (values.length === 1) {
      return firstStatus ? { status: firstStatus } : {};
    }
    if (!firstStatus && secondStatus) {
      return { tester: values[0], status: secondStatus };
    }
    return {
      ...(firstStatus ? { status: firstStatus } : {}),
      tester: values[1],
    };
  };
   
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLSelectElement>,
    startIndex: number,
    startField: 'tester' | 'status'
  ) => {
    if (!runData) return;
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
  
    const rows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const newResults = { ...runData.results };
    let hasUpdate = false;
  
    rows.forEach((row, rowOffset) => {
      if (!row.trim()) return;
      const cells = row.split('\t');
      const rowIndex = startIndex + rowOffset;
      if (rowIndex >= filteredCases.length) return;
      const caseId = filteredCases[rowIndex].id;
      const current = newResults[caseId] || { status: 'UNTESTED', tester: '', note: '' };
      const parsed = parsePasteRow(cells, startField);
      if (Object.keys(parsed).length === 0) return;
  
      newResults[caseId] = {
        ...current,
        ...parsed,
        updatedAt: new Date().toISOString(),
      };
      hasUpdate = true;
    });
 
    if (!hasUpdate) return;
 
    const newRunData = { ...runData, results: newResults };
    setRunData(newRunData);
    autoSave(newRunData);
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

  // ステータスフィルターの個別切替
  const toggleStatusFilter = (key: string) => {
    const next = new Set(selectedStatuses);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedStatuses(next);
  };

  // ステータスフィルターの全選択 / 全解除
  const toggleAllStatusFilters = () => {
    if (selectedStatuses.size === ALL_STATUSES.length) {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set(ALL_STATUSES.map((s) => s.key)));
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">データを読み込み中...</div>;
  if (!runData || runData.error) return <div className="p-8 text-center text-red-500 font-medium">対象のテスト項目書が見つかりませんでした</div>;

  // フィルタリング処理（検索窓 ＋ ステータスチェックボックス）
  const filteredCases = casesData.filter((tc: any) => {
    const result = runData.results?.[tc.id] || {};
    const matchesSearch =
      tc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.screen.includes(searchQuery) ||
      tc.feature.includes(searchQuery) ||
      tc.steps.includes(searchQuery) ||
      (result.tester && result.tester.includes(searchQuery));

    const caseStatus = result.status || 'UNTESTED';
    const matchesStatus = selectedStatuses.has(caseStatus);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 max-w-[1800px] mx-auto pb-12">
      {/* ヘッダー情報 */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
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

      {/* 検索・ステータス複数チェックボックス・一括操作バー */}
      <div className="bg-slate-800 text-white p-3.5 rounded-xl shadow space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {/* 検索入力 */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 検索 (ID, 画面, 機能, 実施者...)"
              className="w-full max-w-xs px-3 py-1.5 text-xs text-slate-900 rounded bg-white border border-slate-300 focus:outline-none"
            />

            {/* ステータス複数選択チェックボックスメニュー */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusFilterOpen(!statusFilterOpen)}
                className="px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50 focus:outline-none"
              >
                <span>🏷️ ステータス絞り込み</span>
                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  {selectedStatuses.size} / {ALL_STATUSES.length}
                </span>
                <span className="text-[10px]">▼</span>
              </button>

              {/* ポップアップドロップダウン */}
              {statusFilterOpen && (
                <div className="absolute left-0 mt-1 w-52 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-xl z-30 p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 text-[11px] font-bold">
                    <span className="text-slate-700">表示するステータス</span>
                    <button
                      type="button"
                      onClick={toggleAllStatusFilters}
                      className="text-blue-600 hover:underline text-[10px] font-bold"
                    >
                      {selectedStatuses.size === ALL_STATUSES.length ? '全解除' : '全選択'}
                    </button>
                  </div>
                  {ALL_STATUSES.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-1 text-xs hover:bg-slate-100 rounded cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.has(item.key)}
                        onChange={() => toggleStatusFilter(item.key)}
                        className="rounded cursor-pointer"
                      />
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.color}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                  <div className="pt-1.5 border-t border-slate-100 text-right">
                    <button
                      type="button"
                      onClick={() => setStatusFilterOpen(false)}
                      className="px-2.5 py-1 text-[10px] bg-slate-800 text-white rounded font-bold"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 一括「実施者」割り当て */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 border-l border-slate-600 pl-4">
            <div className="flex items-center gap-2">
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
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded font-bold transition shadow-sm"
              >
                一括適用
              </button>
            </div>
            <div className="text-[10px] text-slate-300">
              実施者列・ステータス列に Excel から複数行貼り付けができます。
            </div>
          </div>
        </div>
      </div>

      {/* メインテーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-x-auto qa-table-container">
        <table className="text-left border-collapse table-fixed w-max">
          <thead>
            <tr className="bg-slate-200 text-[11px] text-slate-800 font-bold uppercase select-none">
              <th style={{ width: `${colWidths.check}px` }} className="relative p-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredCases.length}
                  onChange={() => toggleSelectAll(filteredCases)}
                  className="rounded cursor-pointer"
                />
                <div onMouseDown={(e) => startResizing('check', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.id}px` }} className="relative p-2">
                ID
                <div onMouseDown={(e) => startResizing('id', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.priority}px` }} className="relative p-2">
                重要度
                <div onMouseDown={(e) => startResizing('priority', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.screen}px` }} className="relative p-2">
                画面 / 機能
                <div onMouseDown={(e) => startResizing('screen', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.precondition}px` }} className="relative p-2">
                前提条件
                <div onMouseDown={(e) => startResizing('precondition', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.steps}px` }} className="relative p-2">
                確認手順
                <div onMouseDown={(e) => startResizing('steps', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.expected}px` }} className="relative p-2">
                確認内容（期待値）
                <div onMouseDown={(e) => startResizing('expected', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.tester}px` }} className="relative p-2 bg-blue-100 text-blue-900">
                実施者
                <div onMouseDown={(e) => startResizing('tester', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.status}px` }} className="relative p-2">
                結果ステータス
                <div onMouseDown={(e) => startResizing('status', e)} className="resizer" />
              </th>
              <th style={{ width: `${colWidths.note}px` }} className="relative p-2">
                備考・バグ情報
                <div onMouseDown={(e) => startResizing('note', e)} className="resizer" />
              </th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {filteredCases.map((tc: any, index: number) => {
              const result = runData.results?.[tc.id] || {
                status: 'UNTESTED',
                tester: tc.defaultTester || '',
                note: '',
              };
              const isSelected = selectedIds.has(tc.id);

              return (
                <tr
                  key={tc.id}
                  className={`hover:bg-blue-50/50 transition ${isSelected ? 'bg-blue-50/80' : ''}`}
                >
                  <td className="p-2 text-center align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(tc.id)}
                      className="rounded cursor-pointer mt-0.5"
                    />
                  </td>
                  <td className="p-2 align-top font-mono font-bold text-slate-800">
                    {tc.id}
                  </td>
                  <td className="p-2 align-top text-center">
                    {tc.priority ? (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tc.priority === 'A' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {tc.priority}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-2 align-top">
                    <div className="font-bold text-slate-800">{tc.screen || '-'}</div>
                    <div className="text-slate-500 mt-0.5">{tc.feature || '-'}</div>
                  </td>
                  <td className="p-2 align-top text-slate-600 whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {tc.precondition || '-'}
                  </td>
                  <td className="p-2 align-top text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {tc.steps || '-'}
                  </td>
                  <td className="p-2 align-top text-slate-900 font-medium whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {tc.expected || '-'}
                  </td>
                  <td className="p-2 align-top bg-blue-50/30">
                    <input
                      type="text"
                      value={result.tester || ''}
                      onChange={(e) => updateResult(tc.id, { tester: e.target.value }, false)}
                      onPaste={(e) => handlePaste(e, index, 'tester')}
                      placeholder="担当者"
                      className="w-full p-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </td>
                  <td className="p-2 align-top">
                    <select
                      value={result.status || 'UNTESTED'}
                      onChange={(e) => updateResult(tc.id, { status: e.target.value as any }, true)}
                      onPaste={(e) => handlePaste(e, index, 'status')}
                      className={`w-full p-1.5 text-xs font-bold rounded border cursor-pointer ${
                        result.status === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : result.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : result.status === 'BLOCKED'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : result.status === 'AUTOMATED'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : result.status === 'EXCLUDED'
                          ? 'bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      <option value="UNTESTED">未実施</option>
                      <option value="PASSED">OK</option>
                      <option value="FAILED">NG</option>
                      <option value="BLOCKED">保留</option>
                      <option value="EXCLUDED">対象外</option>
                      <option value="AUTOMATED">自動化</option>
                    </select>
                  </td>
                  <td className="p-2 align-top">
                    <textarea
                      rows={2}
                      value={result.note || ''}
                      onChange={(e) => updateResult(tc.id, { note: e.target.value }, false)}
                      placeholder="備考・不具合リンク"
                      className="w-full p-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y bg-white"
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