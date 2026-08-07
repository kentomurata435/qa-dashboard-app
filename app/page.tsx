import Link from 'next/link';
import fs from 'fs';
import path from 'path';

async function getRuns() {
  const runsDir = path.join(process.cwd(), 'data/runs');
  if (!fs.existsSync(runsDir)) return [];
  
  const files = fs.readdirSync(runsDir);
  const runs = files
    .filter((f) => f.endsWith('.json'))
    .map((file) => {
      const filePath = path.join(runsDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return content;
    });

  return runs;
}

export default async function HomePage() {
  const runs = await getRuns();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">テスト実行一覧</h1>
          <p className="text-sm text-slate-500">プロジェクトのテスト実行状態を管理します</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {runs.map((run: any) => {
          const total = Object.keys(run.results || {}).length;
          const passed = Object.values(run.results || {}).filter((r: any) => r.status === 'PASSED').length;
          const failed = Object.values(run.results || {}).filter((r: any) => r.status === 'FAILED').length;
          const progress = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0;

          return (
            <div key={run.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">{run.title}</h2>
              <p className="text-xs text-slate-400 mb-4">ID: {run.id}</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>進捗率: {progress}%</span>
                  <span>Pass: {passed} / Fail: {failed} / Total: {total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                  <div className="bg-green-500 h-full" style={{ width: `${total ? (passed / total) * 100 : 0}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${total ? (failed / total) * 100 : 0}%` }} />
                </div>
              </div>

              <Link
                href={`/runs/${run.id}`}
                className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
              >
                テスト管理画面を開く
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}