import React, { useState } from 'react';
import {
  Download,
  FileJson,
  Upload,
  Check,
  Film,
  Sparkles,
  Code2,
  Tv,
  Plus,
  List
} from 'lucide-react';
import { ScenarioBook, AspectRatio, ScenarioNode } from './types/scenario';
import { ExportFormat, ExportProgress } from './types/export';
import { defaultScenarioBook } from './data/sampleScenarios';
import { CanvasPlayer } from './components/CanvasPlayer';
import { exportScenarioToGif } from './utils/gifExporter';
import { exportScenarioToVideo } from './utils/videoExporter';

export const App: React.FC = () => {
  const [book, setBook] = useState<ScenarioBook>(defaultScenarioBook);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(book.scenarios[0]?.id || '');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(book.aspectRatio || '16:9');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webm');
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
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

  // Export current scenario to selected format (GIF, WebM, MP4)
  const handleExport = async () => {
    if (!activeScenario || isExporting) return;
    try {
      setIsExporting(true);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const bgSuffix = transparentBg ? '_transparent' : '';

      let downloadBlob: Blob;
      let ext: string;

      if (exportFormat === 'gif') {
        downloadBlob = await exportScenarioToGif(
          activeScenario,
          aspectRatio,
          (p) => setExportProgress(p),
          transparentBg
        );
        ext = 'gif';
      } else {
        const result = await exportScenarioToVideo(
          activeScenario,
          aspectRatio,
          { format: exportFormat, transparentBg },
          (p) => setExportProgress(p)
        );
        downloadBlob = result.blob;
        ext = result.extension;
      }

      // Trigger download
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeScenario.id || 'scenario'}_${aspectRatio.replace(':', 'x')}${bgSuffix}_${timestamp}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Error:', err);
      alert(`${exportFormat.toUpperCase()} の書き出しに失敗しました。コンソールを確認してください。`);
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

  // Add a new empty scenario
  const handleAddNewScenario = () => {
    const newId = `scenario-${Date.now().toString().slice(-4)}`;
    const newScenario = {
      id: newId,
      title: `新規シナリオ ${book.scenarios.length + 1}`,
      description: "新しいアニメーション解説",
      nodes: [
        { id: "node1", label: "クライアント", sublabel: "Browser", icon: "laptop", x: 25, y: 50, color: "blue" as const },
        { id: "node2", label: "サーバー", sublabel: "API", icon: "server", x: 75, y: 50, color: "purple" as const }
      ],
      steps: [
        {
          duration: 2000,
          caption: "クライアントからサーバーへリクエストを送信します",
          action: {
            type: "message" as const,
            from: "node1",
            to: "node2",
            label: "リクエスト",
            payload: "data",
            icon: "send",
            status: "safe" as const
          }
        }
      ]
    };
    const updatedBook = { ...book, scenarios: [...book.scenarios, newScenario] };
    setBook(updatedBook);
    setActiveScenarioId(newId);
    setJsonText(JSON.stringify(updatedBook, null, 2));
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

          {/* Export Settings: Format & Transparency */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700/60 text-xs">
            {(['webm', 'mp4', 'gif'] as ExportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold uppercase ${
                  exportFormat === fmt
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Transparent Background Toggle */}
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs cursor-pointer hover:bg-slate-750 transition-colors select-none">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
              className="rounded bg-slate-900 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
            />
            <span className={transparentBg ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
              背景透過
            </span>
          </label>

          {/* Export Action Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
          >
            <Download size={15} />
            <span>{isExporting ? '書き出し中...' : `${exportFormat.toUpperCase()} 出力`}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Left Sidebar + Right Main Preview */}
      <div className="flex-1 flex flex-col md:flex-row p-6 max-w-7xl mx-auto w-full gap-6">
        {/* Left Sidebar: Scenario List */}
        <aside className="w-full md:w-80 lg:w-84 flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <List size={16} className="text-sky-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                シナリオ一覧 ({book.scenarios.length})
              </span>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-300 cursor-pointer transition-colors">
              <Upload size={12} />
              <span>開く</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Vertical Scenario List */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            {book.scenarios.map((sc, index) => {
              const isActive = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => setActiveScenarioId(sc.id)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-900 border-sky-500/60 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 rounded bg-slate-800/60">
                      {sc.steps.length} steps
                    </span>
                  </div>
                  <h3
                    className={`text-xs font-bold leading-snug line-clamp-2 ${
                      isActive ? 'text-sky-200' : 'text-slate-200'
                    }`}
                  >
                    {sc.title}
                  </h3>
                  {sc.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {sc.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add Scenario Button */}
          <button
            onClick={handleAddNewScenario}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-slate-700 hover:border-sky-500/60 text-slate-400 hover:text-sky-300 text-xs font-semibold transition-colors mt-1"
          >
            <Plus size={14} />
            <span>新規シナリオ追加</span>
          </button>
        </aside>

        {/* Right Main Area: Preview Player & Controls */}
        <main className="flex-1 flex flex-col items-center gap-4 min-w-0">
          {/* Active Scenario Title Banner */}
          {activeScenario && (
            <div className="w-full flex flex-col pb-2 border-b border-slate-800/60">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {activeScenario.title}
              </h2>
              {activeScenario.description && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeScenario.description}
                </p>
              )}
            </div>
          )}

          {/* Player & Preview Area */}
          <div className="w-full flex flex-col items-center justify-center">
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
            <div className="w-full max-w-4xl p-4 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-xl flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400">
                  {exportProgress.phase === 'rendering'
                    ? `フレーム描画中 (${exportProgress.currentFrame}/${exportProgress.totalFrames})`
                    : exportProgress.phase === 'recording'
                    ? `動画ストリーム録画中 (${exportProgress.currentFrame}/${exportProgress.totalFrames})`
                    : exportProgress.phase === 'encoding'
                    ? 'ファイルエンコード中...'
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
            <div className="w-full max-w-4xl p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3 shadow-2xl">
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
    </div>
  );
};
