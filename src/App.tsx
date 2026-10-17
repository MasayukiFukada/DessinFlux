import React, { useState } from 'react';
import {
  Download,
  FileJson,
  Upload,
  Check,
  Film,
  Sparkles,
  Code2,
  Tv
} from 'lucide-react';
import { ScenarioBook, AspectRatio, ScenarioNode } from './types/scenario';
import { defaultScenarioBook } from './data/sampleScenarios';
import { CanvasPlayer } from './components/CanvasPlayer';
import { exportScenarioToGif, ExportProgress } from './utils/gifExporter';

export const App: React.FC = () => {
  const [book, setBook] = useState<ScenarioBook>(defaultScenarioBook);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(book.scenarios[0]?.id || '');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(book.aspectRatio || '16:9');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(book, null, 2));
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const activeScenario = book.scenarios.find((s) => s.id === activeScenarioId) || book.scenarios[0];

  // Handle node drag update
  const handleUpdateNodes = (updatedNodes: ScenarioNode[]) => {
    const updatedScenarios = book.scenarios.map((sc) =>
      sc.id === activeScenarioId ? { ...sc, nodes: updatedNodes } : sc
    );
    const updatedBook = { ...book, scenarios: updatedScenarios };
    setBook(updatedBook);
    setJsonText(JSON.stringify(updatedBook, null, 2));
  };

  // Export current scenario to GIF
  const handleExportGif = async () => {
    if (!activeScenario || isExporting) return;
    try {
      setIsExporting(true);
      const gifBlob = await exportScenarioToGif(activeScenario, aspectRatio, (p) => {
        setExportProgress(p);
      });
      // Generate timestamp YYYYMMDD_HHmmss
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      // Trigger download
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeScenario.id || 'scenario'}_${aspectRatio.replace(':', 'x')}_${timestamp}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GIF Export Error:', err);
      alert('GIFの書き出しに失敗しました。コンソールを確認してください。');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Sync JSON text to state
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as ScenarioBook;
      if (!parsed.scenarios || parsed.scenarios.length === 0) {
        alert('エラー: scenarios 配列が空または不正です');
        return;
      }
      setBook(parsed);
      if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
      setActiveScenarioId(parsed.scenarios[0].id);
      alert('シナリオJSONを正常に反映しました！');
    } catch (e) {
      alert('JSONのパースに失敗しました。文法を確認してください。');
    }
  };

  // Upload JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      try {
        const parsed = JSON.parse(text) as ScenarioBook;
        setBook(parsed);
        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        setActiveScenarioId(parsed.scenarios[0].id);
      } catch (err) {
        alert('読み込んだJSONファイルが不正です');
      }
    };
    reader.readAsText(file);
  };

  // Copy AI prompt template
  const handleCopyAiPrompt = () => {
    const promptTemplate = `以下のフォーマットに従って、DessinFlux用の解説アニメーションシナリオJSONを作成してください。

【出力JSONスキーマ】
{
  "title": "解説の全体タイトル",
  "aspectRatio": "16:9",
  "scenarios": [
    {
      "id": "scenario-1",
      "title": "シナリオのタイトル",
      "nodes": [
        { "id": "client", "label": "端末", "sublabel": "Browser", "icon": "laptop", "x": 20, "y": 50, "color": "blue" },
        { "id": "server", "label": "サーバー", "sublabel": "API", "icon": "server", "x": 50, "y": 50, "color": "purple" },
        { "id": "db", "label": "DB", "sublabel": "SQL", "icon": "database", "x": 80, "y": 50, "color": "emerald" }
      ],
      "steps": [
        {
          "duration": 2000,
          "caption": "画面下部に表示する分かりやすい解説字幕",
          "action": {
            "type": "message",
            "from": "client",
            "to": "server",
            "label": "リクエスト内容",
            "payload": "送信データ",
            "icon": "key",
            "status": "safe"
          }
        }
      ]
    }
  ]
}

【作成したいテーマ・要望】
（ここにテーマを記入してください。例: パスワードのハッシュ化、JWT認証の流れなど）`;

    navigator.clipboard.writeText(promptTemplate);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-lg shadow-sky-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              DessinFlux
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                v0.1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-sm">
              {book.title || '動画解説用アニメーショングラフィック'}
            </p>
          </div>
        </div>

        {/* Aspect Ratio Selector & Export Actions */}
        <div className="flex items-center gap-3">
          {/* Aspect Ratio Picker */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700/60 text-xs">
            <Tv size={14} className="text-slate-400 ml-1 mr-1.5" />
            {(['16:9', '1:1', '4:3', '9:16'] as AspectRatio[]).map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  aspectRatio === ar
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>

          {/* AI Prompt Helper Button */}
          <button
            onClick={handleCopyAiPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
            title="AIにシナリオを生成してもらうためのプロンプト雛形をコピー"
          >
            {copiedPrompt ? <Check size={14} /> : <Sparkles size={14} />}
            <span>{copiedPrompt ? 'コピー完了!' : 'AIプロンプト雛形'}</span>
          </button>

          {/* Toggle JSON Editor */}
          <button
            onClick={() => setShowJsonEditor(!showJsonEditor)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              showJsonEditor
                ? 'bg-slate-700 text-white border-slate-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Code2 size={14} />
            <span>JSON</span>
          </button>

          {/* Export GIF Button */}
          <button
            onClick={handleExportGif}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
          >
            <Download size={15} />
            <span>{isExporting ? 'GIF出力中...' : 'GIF出力'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full gap-6">
        {/* Scenario Selection Tabs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              シナリオ選択 ({book.scenarios.length}件)
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                <Upload size={13} />
                <span>JSONファイルを開く</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
            {book.scenarios.map((sc, index) => {
              const isActive = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => setActiveScenarioId(sc.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'bg-slate-800/80 text-sky-300 border-sky-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300">
                    {index + 1}
                  </span>
                  <span>{sc.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Player & Preview Area */}
        <div className="flex flex-col items-center justify-center">
          {activeScenario ? (
            <CanvasPlayer
              scenario={activeScenario}
              aspectRatio={aspectRatio}
              onUpdateNodes={handleUpdateNodes}
            />
          ) : (
            <div className="p-12 text-center text-slate-500">シナリオが選択されていません</div>
          )}
        </div>

        {/* Export Progress Overlay / Banner */}
        {isExporting && exportProgress && (
          <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400">
                {exportProgress.phase === 'rendering'
                  ? `フレーム描画中 (${exportProgress.currentFrame}/${exportProgress.totalFrames})`
                  : exportProgress.phase === 'encoding'
                  ? 'GIFエンコード中...'
                  : '出力完了！'}
              </span>
              <span className="text-slate-400">
                {Math.round((exportProgress.currentFrame / exportProgress.totalFrames) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-150"
                style={{
                  width: `${(exportProgress.currentFrame / exportProgress.totalFrames) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Collapsible JSON Editor */}
        {showJsonEditor && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson size={16} className="text-sky-400" />
                <span className="text-xs font-bold text-slate-200">シナリオJSONエディタ</span>
                <span className="text-[11px] text-slate-400">
                  (AIが生成したJSONをここに貼り付けて反映できます)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyJson}
                  className="px-3 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow"
                >
                  プレビューに反映
                </button>
              </div>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={12}
              className="w-full font-mono text-xs p-3 bg-slate-950 text-slate-200 border border-slate-800 rounded-lg focus:outline-none focus:border-sky-500"
            />
          </div>
        )}
      </main>
    </div>
  );
};
