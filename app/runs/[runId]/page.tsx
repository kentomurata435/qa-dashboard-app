// app/runs/[runId]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import casesData from '@/data/cases.json';

interface TestResult {
  status: 'UNTESTED' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'EXCLUDED' | 'AUTOMATED';
  tester: string;
  note: string;
  priority?: string;
  screen?: string;
  feature?: string;
  precondition?: string;
  steps?: string;
  expected?: string;
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

const ALL_PRIORITIES = [
  { key: 'A', label: 'A', color: 'bg-red-100 text-red-800' },
  { key: 'B', label: 'B', color: 'bg-amber-100 text-amber-800' },
  { key: 'C', label: 'C', color: 'bg-slate-200 text-slate-700' },
  { key: 'D', label: 'D', color: 'bg-slate-100 text-slate-600' },
];

const COLUMN_DEFS = [
  { key: 'screen', label: '画面' },
  { key: 'feature', label: '機能' },
  { key: 'priority', label: '重要度' },
  { key: 'precondition', label: '前提条件' },
  { key: 'steps', label: '確認手順' },
  { key: 'expected', label: '確認内容（期待値）' },
  { key: 'tester', label: '実施者' },
  { key: 'status', label: '結果' },
  { key: 'note', label: '備考' },
] as const;

const DEFAULT_COLUMN_VISIBILITY = Object.fromEntries(
  COLUMN_DEFS.map((column) => [column.key, true])
) as Record<string, boolean>;

const TableRow = memo(function TableRow({
  tc,
  result,
  visibleColumns,
  isSelected,
  onSelect,
  onUpdateField,
  onPasteGrid,
  onKeyDown,
  onResizeTextarea,
}: {
  tc: any;
  result: any;
  visibleColumns: Record<string, boolean>;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdateField: (caseId: string, fieldKey: string, value: any, immediate?: boolean) => void;
  onPasteGrid: (startCaseId: string, startField: string, e: React.ClipboardEvent) => void;
  onKeyDown: (caseId: string, fieldKey: string, e: React.KeyboardEvent) => void;
  onResizeTextarea: (element: HTMLTextAreaElement | null) => void;
}) {
  const priorityVal = result.priority !== undefined ? result.priority : (tc.priority || '');
  const screenVal = result.screen !== undefined ? result.screen : (tc.screen || '');
  const featureVal = result.feature !== undefined ? result.feature : (tc.feature || '');
  const preconditionVal = result.precondition !== undefined ? result.precondition : (tc.precondition || '');
  const stepsVal = result.steps !== undefined ? result.steps : (tc.steps || '');
  const expectedVal = result.expected !== undefined ? result.expected : (tc.expected || '');
  const testerVal = result.tester !== undefined ? result.tester : (tc.defaultTester || '');
  const statusVal = result.status || 'UNTESTED';
  const noteVal = result.note || '';

  return (
    <tr className={`hover:bg-blue-50/40 transition ${isSelected ? 'bg-blue-50/80' : ''}`}>
      <td className="p-1 text-center align-top">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(tc.id)}
          className="rounded cursor-pointer mt-1.5"
        />
      </td>

      <td className="p-2 align-top font-mono font-bold text-slate-800 bg-slate-50/50">
        {tc.id}
      </td>

      {visibleColumns.screen && (
        <td className="p-1 align-top">
          <textarea
            id={`cell-screen-${tc.id}`}
            rows={1}
            value={screenVal}
            ref={onResizeTextarea}
            onInput={(e) => onResizeTextarea(e.currentTarget)}
            onChange={(e) => onUpdateField(tc.id, 'screen', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'screen', e)}
            placeholder="画面名"
            className="auto-height-textarea w-full min-h-[40px] p-1 text-xs border border-transparent hover:border-slate-300 rounded font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white bg-transparent overflow-hidden"
          />
        </td>
      )}

      {visibleColumns.feature && (
        <td className="p-1 align-top">
          <textarea
            id={`cell-feature-${tc.id}`}
            rows={1}
            value={featureVal}
            ref={onResizeTextarea}
            onInput={(e) => onResizeTextarea(e.currentTarget)}
            onChange={(e) => onUpdateField(tc.id, 'feature', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'feature', e)}
            placeholder="機能名"
            className="auto-height-textarea w-full min-h-[40px] p-1 text-xs border border-transparent hover:border-slate-300 rounded text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white bg-transparent overflow-hidden"
          />
        </td>
      )}

      {visibleColumns.priority && (
        <td className="p-1 align-top">
          <select
            id={`cell-priority-${tc.id}`}
            value={priorityVal}
            onChange={(e) => onUpdateField(tc.id, 'priority', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'priority', e)}
            onKeyDown={(e) => onKeyDown(tc.id, 'priority', e)}
            className="w-full p-1.5 text-xs font-bold rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">未設定</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </td>
      )}

      {visibleColumns.precondition && (
        <td className="p-1 align-top">
          <textarea
            id={`cell-precondition-${tc.id}`}
            rows={1}
            value={preconditionVal}
            ref={onResizeTextarea}
            onInput={(e) => onResizeTextarea(e.currentTarget)}
            onChange={(e) => onUpdateField(tc.id, 'precondition', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'precondition', e)}
            placeholder="前提条件"
            className="auto-height-textarea w-full min-h-[40px] p-1 text-xs border border-transparent hover:border-slate-300 rounded text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white bg-transparent overflow-hidden whitespace-pre-wrap font-sans leading-relaxed"
          />
        </td>
      )}

      {visibleColumns.steps && (
        <td className="p-1 align-top">
          <textarea
            id={`cell-steps-${tc.id}`}
            rows={1}
            value={stepsVal}
            ref={onResizeTextarea}
            onInput={(e) => onResizeTextarea(e.currentTarget)}
            onChange={(e) => onUpdateField(tc.id, 'steps', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'steps', e)}
            placeholder="確認手順"
            className="auto-height-textarea w-full min-h-[40px] p-1 text-xs border border-transparent hover:border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white bg-transparent overflow-hidden whitespace-pre-wrap font-sans leading-relaxed"
          />
        </td>
      )}

      {visibleColumns.expected && (
        <td className="p-1 align-top">
          <textarea
            id={`cell-expected-${tc.id}`}
            rows={1}
            value={expectedVal}
            ref={onResizeTextarea}
            onInput={(e) => onResizeTextarea(e.currentTarget)}
            onChange={(e) => onUpdateField(tc.id, 'expected', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'expected', e)}
            placeholder="確認内容・期待値"
            className="auto-height-textarea w-full min-h-[40px] p-1 text-xs border border-transparent hover:border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white bg-transparent overflow-hidden whitespace-pre-wrap font-sans leading-relaxed"
          />
        </td>
      )}

      {visibleColumns.tester && (
        <td className="p-1 align-top bg-blue-50/20">
          <input
            id={`cell-tester-${tc.id}`}
            type="text"
            value={testerVal}
            onChange={(e) => onUpdateField(tc.id, 'tester', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'tester', e)}
            onKeyDown={(e) => onKeyDown(tc.id, 'tester', e)}
            placeholder="担当者"
            className="w-full p-1 text-xs border border-slate-300 rounded font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
          />
        </td>
      )}

      {visibleColumns.status && (
        <td className="p-1 align-top">
          <select
            id={`cell-status-${tc.id}`}
            value={statusVal}
            onChange={(e) => onUpdateField(tc.id, 'status', e.target.value, true)}
            onPaste={(e) => onPasteGrid(tc.id, 'status', e)}
            onKeyDown={(e) => onKeyDown(tc.id, 'status', e)}
            className={`w-full p-1.5 text-xs font-bold rounded border cursor-pointer focus:ring-2 focus:ring-blue-600 ${
              statusVal === 'PASSED'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : statusVal === 'FAILED'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : statusVal === 'BLOCKED'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : statusVal === 'AUTOMATED'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : statusVal === 'EXCLUDED'
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
      )}

      {visibleColumns.note && (
        <td className="p-1 align-top">
          <textarea
            id={`cell-note-${tc.id}`}
            rows={1}
            value={noteVal}
            ref={onResizeTextarea}
            onInput={(e) => onResizeTextarea(e.currentTarget)}
            onChange={(e) => onUpdateField(tc.id, 'note', e.target.value)}
            onPaste={(e) => onPasteGrid(tc.id, 'note', e)}
            placeholder="備考・不具合リンク"
            className="auto-height-textarea w-full min-h-[40px] p-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 overflow-hidden bg-white"
          />
        </td>
      )}
    </tr>
  );
});

// 編集可能列の順序定義（Excel 2次元コピペ用）
const EDITABLE_FIELDS = [
  'screen',
  'feature',
  'priority',
  'precondition',
  'steps',
  'expected',
  'tester',
  'status',
  'note',
] as const;

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

  // フィルター
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(['UNTESTED', 'PASSED', 'FAILED', 'BLOCKED', 'EXCLUDED', 'AUTOMATED'])
  );
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<Set<string>>(new Set(['A', 'B', 'C', 'D']));
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(DEFAULT_COLUMN_VISIBILITY);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);

  // 列幅可変サイズ
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    check: 40,
    id: 85,
    priority: 70,
    screen: 160,
    feature: 180,
    precondition: 260,
    steps: 520,
    expected: 520,
    tester: 120,
    status: 120,
    note: 260,
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

  const fetchLatestData = useCallback(() => {
    fetch(`/api/test-run?runId=${runId}&t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setRunData(data);
          setLoading(false);
          return;
        }
        setRunData(data || { id: runId, title: `${runId} スルーテスト`, results: {} });
        setLoading(false);
      })
      .catch(() => {
        setRunData({
          id: runId,
          title: `${runId} スルーテスト`,
          results: {},
        });
        setLoading(false);
      });
  }, [runId]);

  useEffect(() => {
    fetchLatestData();
  }, [runId, fetchLatestData]);

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

  const resizeTextarea = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(element.scrollHeight, 40)}px`;
  }, []);

  const updateResultField = useCallback((caseId: string, fieldKey: string, value: any, immediate = false) => {
    if (!runData) return;
    const current = runData.results?.[caseId] || {};
    const newResults = {
      ...runData.results,
      [caseId]: {
        ...current,
        [fieldKey]: value,
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
  }, [autoSave, runData]);

  const toggleColumnVisibility = (key: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const mapStatusText = (val: string): TestResult['status'] => {
    const v = val.toUpperCase().trim();
    if (v === 'OK' || v === 'PASSED' || v === '合格' || v === 'PASS') return 'PASSED';
    if (v === 'NG' || v === 'FAILED' || v === '不合格' || v === 'FAIL') return 'FAILED';
    if (v === '保留' || v === 'BLOCKED' || v === 'HOLD') return 'BLOCKED';
    if (v === '対象外' || v === 'EXCLUDED') return 'EXCLUDED';
    if (v === '自動化' || v === 'AUTOMATED') return 'AUTOMATED';
    return 'UNTESTED';
  };

  // SpreadJS強化: 2次元（複数行×複数列）ブロックコピペ機能
  const handlePasteGrid = useCallback((startCaseId: string, startField: string, e: React.ClipboardEvent) => {
    if (!runData) return;

    const pastedData = e.clipboardData.getData('text');
    if (!pastedData) return;

    const rows = pastedData.trim().split(/\r?\n/).map((r) => r.split('\t'));
    if (rows.length === 0) return;

    e.preventDefault();

    const startRowIdx = casesData.findIndex((c: any) => c.id === startCaseId);
    const startColIdx = EDITABLE_FIELDS.indexOf(startField as any);

    if (startRowIdx === -1 || startColIdx === -1) return;

    const newResults = { ...runData.results };

    rows.forEach((rowCells, rOffset) => {
      const targetCase = casesData[startRowIdx + rOffset];
      if (!targetCase) return;

      const current = newResults[targetCase.id] || {};
      const updatedFields: any = {};

      rowCells.forEach((cellValue, cOffset) => {
        const fieldKey = EDITABLE_FIELDS[startColIdx + cOffset];
        if (!fieldKey) return;

        const normalized = cellValue.replace(/\r/g, '');
        const val = normalized.trim();

        if (fieldKey === 'status') {
          updatedFields.status = mapStatusText(val);
        } else {
          updatedFields[fieldKey] = val;
        }
      });

      newResults[targetCase.id] = {
        ...current,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
    });

    const newRunData = { ...runData, results: newResults };
    setRunData(newRunData);
    autoSave(newRunData);
  }, [autoSave, runData]);

  // SpreadJS: Enterキーでの下方向セル移動
  const handleKeyDown = useCallback((caseId: string, fieldKey: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const caseIndex = casesData.findIndex((c: any) => c.id === caseId);
      if (caseIndex !== -1 && caseIndex + 1 < casesData.length) {
        const nextCaseId = casesData[caseIndex + 1].id;
        const nextElem = document.getElementById(`cell-${fieldKey}-${nextCaseId}`);
        if (nextElem) nextElem.focus();
      }
    }
  }, []);

  const handleBatchApplyTester = () => {
    if (selectedIds.size === 0 || !batchTester.trim()) return;
    const newResults = { ...runData.results };
    selectedIds.forEach((id) => {
      const current = newResults[id] || {};
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleStatusFilter = (key: string) => {
    const next = new Set(selectedStatuses);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedStatuses(next);
  };

  const toggleAllStatusFilters = () => {
    if (selectedStatuses.size === ALL_STATUSES.length) {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set(ALL_STATUSES.map((s) => s.key)));
    }
  };

  const togglePriorityFilter = (key: string) => {
    const next = new Set(selectedPriorities);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedPriorities(next);
  };

  const toggleAllPriorityFilters = () => {
    if (selectedPriorities.size === ALL_PRIORITIES.length) {
      setSelectedPriorities(new Set());
    } else {
      setSelectedPriorities(new Set(ALL_PRIORITIES.map((p) => p.key)));
    }
  };

  const filteredCases = useMemo(() => {
    if (!runData) return [];

    return casesData.filter((tc: any) => {
      const result = runData.results?.[tc.id] || {};

      const currentPriority = result.priority !== undefined ? result.priority : tc.priority;
      const currentScreen = result.screen !== undefined ? result.screen : tc.screen;
      const currentFeature = result.feature !== undefined ? result.feature : tc.feature;
      const currentSteps = result.steps !== undefined ? result.steps : tc.steps;
      const currentExpected = result.expected !== undefined ? result.expected : tc.expected;
      const currentTester = result.tester !== undefined ? result.tester : (tc.defaultTester || '');

      const matchesSearch =
        tc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(currentScreen || '').includes(searchQuery) ||
        String(currentFeature || '').includes(searchQuery) ||
        String(currentSteps || '').includes(searchQuery) ||
        String(currentExpected || '').includes(searchQuery) ||
        String(currentTester || '').includes(searchQuery);

      const caseStatus = result.status || 'UNTESTED';
      const casePriority = (result.priority !== undefined ? result.priority : (tc.priority || ''));
      const matchesStatus = selectedStatuses.has(caseStatus);
      const matchesPriority = selectedPriorities.has(casePriority);

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [runData, searchQuery, selectedStatuses, selectedPriorities]);

  const statusSummary = useMemo((): Record<string, number> & {
    total: number;
    completed: number;
    progressRate: number;
    remaining: number;
  } => {
    const summary: Record<string, number> = {
      UNTESTED: 0,
      PASSED: 0,
      FAILED: 0,
      BLOCKED: 0,
      EXCLUDED: 0,
      AUTOMATED: 0,
    };

    if (runData?.results) {
      Object.values(runData.results).forEach((result: any) => {
        const status = result?.status || 'UNTESTED';
        if (summary[status] !== undefined) {
          summary[status] += 1;
        } else {
          summary.UNTESTED += 1;
        }
      });
    }

    const total = casesData.length;
    const completed = summary.PASSED + summary.FAILED + summary.BLOCKED + summary.EXCLUDED + summary.AUTOMATED;
    const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...summary,
      total,
      completed,
      progressRate,
      remaining: total - completed,
    };
  }, [runData]);

  const rowHeight = 42;
  const overscan = 12;
  const visibleStartIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleEndIndex = Math.min(
    filteredCases.length,
    visibleStartIndex + Math.ceil((viewportHeight || 720) / rowHeight) + overscan * 2
  );
  const visibleCases = filteredCases.slice(visibleStartIndex, visibleEndIndex);
  const totalTableHeight = filteredCases.length * rowHeight;

  useEffect(() => {
    const updateViewport = () => {
      if (tableContainerRef.current) {
        setViewportHeight(tableContainerRef.current.clientHeight || 720);
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">データを読み込み中...</div>;
  if (!runData || runData.error) return <div className="p-8 text-center text-red-500 font-medium">対象のテスト項目書が見つかりませんでした</div>;

  return (
    <div className="space-y-4 max-w-[1900px] mx-auto pb-12">
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

      <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-3">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 min-w-[140px]">
              <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500">全件数</div>
              <div className="mt-1 text-lg font-black text-slate-900">{statusSummary.total}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 min-w-[140px]">
              <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500">実施済み</div>
              <div className="mt-1 text-lg font-black text-emerald-700">{statusSummary.completed}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 min-w-[140px]">
              <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500">未実施</div>
              <div className="mt-1 text-lg font-black text-slate-700">{statusSummary.remaining}</div>
            </div>
          </div>

          <div className="min-w-[220px] xl:max-w-[320px] w-full xl:w-auto">
            <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
              <span>進捗率</span>
              <span className="font-bold text-slate-900">{statusSummary.progressRate}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${statusSummary.progressRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {ALL_STATUSES.map((status) => {
            const value = statusSummary[status.key] || 0;
            return (
              <div key={status.key} className={`rounded-lg border px-2.5 py-2 ${status.color} border-opacity-60 bg-white`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-80">{status.label}</div>
                <div className="mt-1 text-lg font-black leading-none">{value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 検索・一括操作バー */}
      <div className="bg-slate-800 text-white p-3.5 rounded-xl shadow space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 検索 (ID, 画面, 機能, 実施者...)"
              className="w-full max-w-xs px-3 py-1.5 text-xs text-slate-900 rounded bg-white border border-slate-300 focus:outline-none"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                className="px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50 focus:outline-none"
              >
                <span>📋 列表示</span>
                <span className="bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  {Object.values(visibleColumns).filter(Boolean).length} / {COLUMN_DEFS.length}
                </span>
                <span className="text-[10px]">▼</span>
              </button>

              {columnMenuOpen && (
                <div className="absolute left-0 mt-1 w-56 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-xl z-30 p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 text-[11px] font-bold">
                    <span className="text-slate-700">表示する列</span>
                    <button
                      type="button"
                      onClick={() => setVisibleColumns({ ...DEFAULT_COLUMN_VISIBILITY })}
                      className="text-sky-600 hover:underline text-[10px] font-bold"
                    >
                      全表示
                    </button>
                  </div>
                  {COLUMN_DEFS.map((column) => (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 p-1 text-xs hover:bg-slate-100 rounded cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.key]}
                        onChange={() => toggleColumnVisibility(column.key)}
                        className="rounded cursor-pointer"
                      />
                      <span>{column.label}</span>
                    </label>
                  ))}
                  <div className="pt-1.5 border-t border-slate-100 text-right">
                    <button
                      type="button"
                      onClick={() => setColumnMenuOpen(false)}
                      className="px-2.5 py-1 text-[10px] bg-slate-800 text-white rounded font-bold"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setPriorityFilterOpen(!priorityFilterOpen)}
                className="px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50 focus:outline-none"
              >
                <span>⚑ 重要度絞り込み</span>
                <span className="bg-violet-100 text-violet-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  {selectedPriorities.size} / {ALL_PRIORITIES.length}
                </span>
                <span className="text-[10px]">▼</span>
              </button>

              {priorityFilterOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-xl z-30 p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 text-[11px] font-bold">
                    <span className="text-slate-700">表示する重要度</span>
                    <button
                      type="button"
                      onClick={toggleAllPriorityFilters}
                      className="text-violet-600 hover:underline text-[10px] font-bold"
                    >
                      {selectedPriorities.size === ALL_PRIORITIES.length ? '全解除' : '全選択'}
                    </button>
                  </div>
                  {ALL_PRIORITIES.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-1 text-xs hover:bg-slate-100 rounded cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPriorities.has(item.key)}
                        onChange={() => togglePriorityFilter(item.key)}
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
                      onClick={() => setPriorityFilterOpen(false)}
                      className="px-2.5 py-1 text-[10px] bg-slate-800 text-white rounded font-bold"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>

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

          <div className="flex items-center gap-2 border-l border-slate-600 pl-4">
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
        </div>
      </div>

      {/* 完全 Excellike スプレッドシートテーブル */}
      <div
        ref={tableContainerRef}
        className="bg-white rounded-xl shadow-sm border border-slate-300 qa-table-container"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: `${totalTableHeight}px`, position: 'relative' }}>
          <table
            className="text-left border-collapse table-fixed w-max"
            style={{ minWidth: '2100px', position: 'absolute', inset: 0, top: `${visibleStartIndex * rowHeight}px` }}
          >
            <colgroup>
              <col style={{ width: `${colWidths.check}px` }} />
              <col style={{ width: `${colWidths.id}px` }} />
              <col style={{ width: `${colWidths.screen}px` }} />
              <col style={{ width: `${colWidths.feature}px` }} />
              <col style={{ width: `${colWidths.priority}px` }} />
              <col style={{ width: `${colWidths.precondition}px` }} />
              <col style={{ width: `${colWidths.steps}px` }} />
              <col style={{ width: `${colWidths.expected}px` }} />
              <col style={{ width: `${colWidths.tester}px` }} />
              <col style={{ width: `${colWidths.status}px` }} />
              <col style={{ width: `${colWidths.note}px` }} />
            </colgroup>
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
                  ID (固定)
                  <div onMouseDown={(e) => startResizing('id', e)} className="resizer" />
                </th>
                {visibleColumns.screen && (
                  <th style={{ width: `${colWidths.screen}px` }} className="relative p-2">
                    画面
                    <div onMouseDown={(e) => startResizing('screen', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.feature && (
                  <th style={{ width: `${colWidths.feature}px` }} className="relative p-2">
                    機能
                    <div onMouseDown={(e) => startResizing('feature', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.priority && (
                  <th style={{ width: `${colWidths.priority}px` }} className="relative p-2">
                    重要度
                    <div onMouseDown={(e) => startResizing('priority', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.precondition && (
                  <th style={{ width: `${colWidths.precondition}px` }} className="relative p-2">
                    前提条件
                    <div onMouseDown={(e) => startResizing('precondition', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.steps && (
                  <th style={{ width: `${colWidths.steps}px` }} className="relative p-2">
                    確認手順
                    <div onMouseDown={(e) => startResizing('steps', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.expected && (
                  <th style={{ width: `${colWidths.expected}px` }} className="relative p-2">
                    確認内容（期待値）
                    <div onMouseDown={(e) => startResizing('expected', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.tester && (
                  <th style={{ width: `${colWidths.tester}px` }} className="relative p-2 bg-blue-100 text-blue-900">
                    実施者
                    <div onMouseDown={(e) => startResizing('tester', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.status && (
                  <th style={{ width: `${colWidths.status}px` }} className="relative p-2">
                    結果
                    <div onMouseDown={(e) => startResizing('status', e)} className="resizer" />
                  </th>
                )}
                {visibleColumns.note && (
                  <th style={{ width: `${colWidths.note}px` }} className="relative p-2">
                    備考
                    <div onMouseDown={(e) => startResizing('note', e)} className="resizer" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-xs">
              {visibleCases.map((tc: any) => {
                const rowResult = runData.results?.[tc.id] || {};
                const isSelected = selectedIds.has(tc.id);

                return (
                  <TableRow
                    key={tc.id}
                    tc={tc}
                    result={rowResult}
                    visibleColumns={visibleColumns}
                    isSelected={isSelected}
                    onSelect={toggleSelect}
                    onUpdateField={updateResultField}
                    onPasteGrid={handlePasteGrid}
                    onKeyDown={handleKeyDown}
                    onResizeTextarea={resizeTextarea}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}