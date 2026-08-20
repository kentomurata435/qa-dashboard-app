// app/api/importer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const templateDir = () => path.join(process.cwd(), 'data', 'case-templates');

const slug = (s: string) =>
  s
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'template';

// ヘッダー行を探す（「ID」を含み、確認手順/確認内容/重要度のいずれかを含む行）
const findHeaderRow = (rows: any[][]) => {
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].map((v) => String(v ?? '')).join(' ').toUpperCase();
    if (joined.includes('ID') && (joined.includes('確認手順') || joined.includes('確認内容') || joined.includes('重要度'))) return i;
  }
  return Math.min(1, Math.max(0, rows.length - 1));
};

const getCell = (rows: any[][], headerRow: number, r: number, keywords: string[]) => {
  const headerRowCells = rows[headerRow] || [];
  for (let c = 0; c < headerRowCells.length; c++) {
    const headerName = String(headerRowCells[c] || '').trim();
    for (const kw of keywords) {
      if (headerName.includes(kw)) {
        const raw = rows[r]?.[c];
        if (raw === undefined || raw === null) return '';
        const s = String(raw).trim();
        if (s === '' || s.toLowerCase() === 'nan') return '';
        return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      }
    }
  }
  return '';
};

const shortNow = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// GET: アップロード済みケーステンプレート一覧
export async function GET() {
  const dir = templateDir();
  const list: { templateId: string; name: string; count: number }[] = [];
  try {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.json')) continue;
        try {
          const cases = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
          list.push({
            templateId: file.replace(/\.json$/, ''),
            name: file.replace(/\.json$/, ''),
            count: Array.isArray(cases) ? cases.length : 0,
          });
        } catch (e) {}
      }
    }
  } catch (e) {}
  list.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return NextResponse.json(list, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

// POST: xlsxを解析して data/case-templates/ に保存し、templateId を返す
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'アップロードファイル(xlsx) を選択してください' }, { status: 400 });
    }

    const buf = Buffer.from(await (file as File).arrayBuffer());
    let sheet;
    try {
      const book = XLSX.read(buf);
      // Sheets はバージョンによって配列の場合と 名前→シート のオブジェクトの場合がある
      const sheets = Array.isArray(book.Sheets)
        ? (book.Sheets as any[])
        : Object.values(book.Sheets || {});
      if (sheets.length > 0) sheet = sheets[0];
      for (const s of sheets) {
        if (String((s as any).name || '').trim() === '機能一覧') {
          sheet = s as any;
          break;
        }
      }
    } catch (e: any) {
      return NextResponse.json({ error: `xlsxの解析に失敗しました: ${e.message}` }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    const headerRow = findHeaderRow(rows);

    const cases: any[] = [];
    for (let r = headerRow + 1; r < rows.length; r++) {
      const idRaw = getCell(rows, headerRow, r, ['ID', 'ＩＤ']);
      if (!idRaw) continue;
      let caseId = idRaw;
      const trimmed = idRaw.trim();
      if (/^\d+$/.test(trimmed)) {
        caseId = 'TC-' + String(Math.floor(Number(trimmed))).padStart(3, '0');
      }
      cases.push({
        id: caseId,
        screen: getCell(rows, headerRow, r, ['画面']),
        feature: getCell(rows, headerRow, r, ['機能']),
        priority: getCell(rows, headerRow, r, ['重要度', '優先度', 'Priority']),
        precondition: getCell(rows, headerRow, r, ['前提条件', '前提']),
        steps: getCell(rows, headerRow, r, ['確認手順', '手順', '操作手順']),
        expected: getCell(rows, headerRow, r, ['確認内容', '期待結果', '期待値']),
        defaultTester: getCell(rows, headerRow, r, ['実施者', '担当者']),
        remark: getCell(rows, headerRow, r, ['備考', 'バグ情報', 'メモ']),
      });
    }

    if (cases.length === 0) {
      return NextResponse.json({ error: 'テストケースが見つかりませんでした(xlsxのシート構成を確認してください)' }, { status: 400 });
    }

    const baseId = slug((file as File).name.replace(/\.xlsx$/i, ''));
    const templateId = `${baseId}-${shortNow()}`;
    fs.mkdirSync(templateDir(), { recursive: true });
    fs.writeFileSync(path.join(templateDir(), `${templateId}.json`), JSON.stringify(cases, null, 2), 'utf-8');

    return NextResponse.json({ success: true, templateId, name: baseId, count: cases.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'アップロード処理に失敗しました' }, { status: 500 });
  }
}