import React, { useState, useEffect } from 'react'
import {
  Terminal,
  Monitor,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  Send,
  ExternalLink
} from 'lucide-react'

// Import logic directly from hooks/register
import {
  label,
  level,
  tokens,
  untilReset,
  segments,
  line,
  type Level,
  type Segment
} from '../hooks/register'
import type { Snapshot, Limit } from '../types'

// Import tests so they register in claude-code-testing harness
import '../hooks/register.test'
import '../hooks/band.test'
import { registeredUnitTests, runTest, type TestResult } from './claude-code-testing'

const COLOR_MAP: Record<Level, { badge: string; text: string; bg: string; border: string }> = {
  ok: {
    badge: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500',
    border: 'border-emerald-500/30',
  },
  warn: {
    badge: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    text: 'text-amber-400',
    bg: 'bg-amber-500',
    border: 'border-amber-500/30',
  },
  high: {
    badge: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
    text: 'text-rose-400',
    bg: 'bg-rose-500',
    border: 'border-rose-500/30',
  },
  info: {
    badge: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
    text: 'text-sky-400',
    bg: 'bg-sky-500',
    border: 'border-sky-500/30',
  },
}

export default function App() {
  // Surface mode: terminal or desktop
  const [surface, setSurface] = useState<'terminal' | 'desktop'>('terminal')
  const [activeTab, setActiveTab] = useState<'preview' | 'tests' | 'install'>('preview')

  // Simulation State
  const [now, setNow] = useState<number>(Date.parse('2026-10-18T10:00:00Z'))
  const [fiveHourPercent, setFiveHourPercent] = useState<number>(42)
  const [fiveHourMinutesLeft, setFiveHourMinutesLeft] = useState<number>(70) // 1 hr 10 min
  
  const [sevenDayPercent, setSevenDayPercent] = useState<number>(18)
  const [sevenDayHoursLeft, setSevenDayHoursLeft] = useState<number>(77) // 3 d 5 hr

  const [contextTokens, setContextTokens] = useState<number>(76000)
  const [contextWindow, setContextWindow] = useState<number>(200000)
  const [sessionTokens, setSessionTokens] = useState<number>(1300000)

  const [isHidden, setIsHidden] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [copiedInstall, setCopiedInstall] = useState<boolean>(false)

  // Interactive simulated prompt input
  const [promptText, setPromptText] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; tokens?: number }>>([
    {
      role: 'user',
      text: 'Проверь тесты проекта и покажи статус лимитов Claude Code',
    },
    {
      role: 'assistant',
      text: 'Все тесты выполнены успешно. Плагин limits-band обновляет метрики после каждого ответа.',
      tokens: 4200,
    },
  ])

  // Test Runner State
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false)

  // Compute ISO timestamps for resets
  const fiveHourResetIso = new Date(now + fiveHourMinutesLeft * 60000).toISOString()
  const sevenDayResetIso = new Date(now + sevenDayHoursLeft * 3600000).toISOString()

  // Build snapshot object matching types/index.d.ts
  const currentSnapshot: Snapshot = {
    limits: [
      { kind: 'five_hour', percentUsed: fiveHourPercent, resetsAt: fiveHourResetIso },
      { kind: 'seven_day', percentUsed: sevenDayPercent, resetsAt: sevenDayResetIso },
    ],
    contextTokens: contextTokens,
    contextWindow: contextWindow,
  }

  // Calculate segments and plain text line using original functions
  const currentSegments: Segment[] = segments(currentSnapshot, sessionTokens, now)
  const currentSummaryLine: string = line(currentSnapshot, sessionTokens, now)

  // Run tests on mount
  useEffect(() => {
    runAllUnitTests()
  }, [])

  const runAllUnitTests = async () => {
    setIsRunningTests(true)
    const results: TestResult[] = []
    for (const testCase of registeredUnitTests) {
      const res = await runTest(testCase)
      results.push(res)
    }
    setTestResults(results)
    setIsRunningTests(false)
  }

  // Trigger toast if 5-hour limit reaches >= 90% (matching hook behavior)
  const updateFiveHour = (newVal: number) => {
    setFiveHourPercent(newVal)
    if (newVal >= 90) {
      setToastMessage(`Лимит 5 часов: ${newVal}%`)
      setTimeout(() => setToastMessage(null), 4000)
    }
  }

  // Apply scenario presets
  const applyPreset = (preset: 'readme' | 'critical' | 'empty' | 'high_context') => {
    setIsHidden(false)
    if (preset === 'readme') {
      setFiveHourPercent(42)
      setFiveHourMinutesLeft(70)
      setSevenDayPercent(18)
      setSevenDayHoursLeft(77)
      setContextTokens(76000)
      setContextWindow(200000)
      setSessionTokens(1300000)
    } else if (preset === 'critical') {
      updateFiveHour(92)
      setFiveHourMinutesLeft(25)
      setSevenDayPercent(64)
      setSevenDayHoursLeft(18)
      setContextTokens(140000)
      setContextWindow(200000)
      setSessionTokens(2400000)
    } else if (preset === 'empty') {
      setFiveHourPercent(0)
      setFiveHourMinutesLeft(300)
      setSevenDayPercent(0)
      setSevenDayHoursLeft(168)
      setContextTokens(0)
      setContextWindow(200000)
      setSessionTokens(0)
    } else if (preset === 'high_context') {
      setFiveHourPercent(72)
      setFiveHourMinutesLeft(140)
      setSevenDayPercent(45)
      setSevenDayHoursLeft(55)
      setContextTokens(188000)
      setContextWindow(200000)
      setSessionTokens(1850000)
    }
  }

  // Simulate turn complete (user sends message, tokens accumulated)
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const msg = promptText.trim() || 'Покажи оставшийся лимит контекста'
    setPromptText('')

    const addedTokens = Math.floor(Math.random() * 8000) + 1500
    const newContextTokens = Math.min(contextWindow, contextTokens + Math.floor(addedTokens * 0.4))
    const newSessionTokens = sessionTokens + addedTokens

    setContextTokens(newContextTokens)
    setSessionTokens(newSessionTokens)

    setChatHistory(prev => [
      ...prev,
      { role: 'user', text: msg },
      {
        role: 'assistant',
        text: `Запрос обработан. Использовано +${addedTokens} токенов в этом ходе. Полоса limits-band обновлена.`,
        tokens: addedTokens,
      },
    ])
  }

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('/plugin install limits-band --marketplace kirsanovyamkino-commits/limits-band')
    setCopiedInstall(true)
    setTimeout(() => setCopiedInstall(false), 2500)
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-black shadow-md shadow-amber-500/10">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-zinc-100 tracking-tight text-base">limits-band</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  v0.3.0
                </span>
                <span className="text-xs text-zinc-400 hidden sm:inline">Claude Code Plugin</span>
              </div>
              <p className="text-xs text-zinc-400 hidden md:block">
                Полоса лимитов подписки (5 ч, неделя), токенов контекста и сеанса над полем ввода
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-zinc-800 p-0.5 border border-zinc-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'preview'
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Интерактивное превью
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tests')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'tests'
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Тесты
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {testResults.filter(t => t.passed).length}/{registeredUnitTests.length || 6}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('install')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'install'
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Установка
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {activeTab === 'preview' && (
          <>
            {/* Left Column: Interactive Simulation Interface */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Surface & Mode Switcher */}
              <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">Окружение:</span>
                  <div className="flex rounded-md bg-zinc-800/80 p-0.5 border border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => setSurface('terminal')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        surface === 'terminal'
                          ? 'bg-zinc-900 text-amber-400 shadow-xs border border-zinc-700/60'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Terminal (CLI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSurface('desktop')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        surface === 'desktop'
                          ? 'bg-zinc-900 text-amber-400 shadow-xs border border-zinc-700/60'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Desktop App
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isHidden ? (
                    <button
                      type="button"
                      onClick={() => setIsHidden(false)}
                      className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Показать полосу
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      Полоса активна
                    </span>
                  )}
                </div>
              </div>

              {/* Toast Notification Simulated Overlay */}
              {toastMessage && (
                <div className="bg-rose-950/90 border border-rose-600 text-rose-200 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between shadow-lg shadow-rose-950/50 animate-bounce">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-medium">Уведомление Claude Code:</span>
                    <span>{toastMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToastMessage(null)}
                    className="text-rose-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Simulated Claude Code Session Window */}
              <div
                className={`rounded-xl border ${
                  surface === 'terminal'
                    ? 'border-zinc-800 bg-black font-mono shadow-2xl'
                    : 'border-zinc-700/70 bg-zinc-900 font-sans shadow-2xl'
                } flex flex-col overflow-hidden min-h-[460px]`}
              >
                {/* Window Bar */}
                <div className="bg-zinc-900/90 border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></div>
                    <span className="text-xs text-zinc-400 ml-2 font-mono">
                      {surface === 'terminal' ? 'claude-code — ~/my-project' : 'Claude Code Desktop'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">hook: AbovePrompt</span>
                </div>

                {/* Chat Log */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs leading-relaxed">
                  <div className="text-zinc-500 border-b border-zinc-800/60 pb-2 flex items-center justify-between">
                    <span>Claude Code v1.0.0 (session started)</span>
                    <span>{new Date(now).toLocaleTimeString('ru-RU')}</span>
                  </div>

                  {chatHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        item.role === 'user'
                          ? 'bg-zinc-800/50 border border-zinc-700/40 text-zinc-200'
                          : 'bg-zinc-900/40 border border-zinc-800/70 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                        <span className={item.role === 'user' ? 'text-amber-400 font-semibold' : 'text-purple-400 font-semibold'}>
                          {item.role === 'user' ? '❯ User' : '✦ Claude'}
                        </span>
                        {item.tokens && (
                          <span className="text-zinc-500">+{tokens(item.tokens)} токенов</span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{item.text}</div>
                    </div>
                  ))}
                </div>

                {/* AbovePrompt Component Area (Where limits-band renders!) */}
                <div className="p-3 bg-zinc-950/80 border-t border-zinc-800/80">
                  {/* The exact AbovePrompt Band */}
                  {!isHidden ? (
                    <div className="mb-2 p-2 rounded-md border border-zinc-700/60 bg-zinc-900/90 shadow-xs flex flex-wrap items-center gap-x-3 gap-y-1.5 transition-all">
                      {currentSegments.length === 0 ? (
                        <span className="text-xs text-zinc-400">Лимиты: данных пока нет</span>
                      ) : (
                        currentSegments.map((seg, i) => {
                          const clr = COLOR_MAP[seg.level]
                          return (
                            <div key={`seg-${i}`} className="flex items-center gap-1.5 text-xs">
                              <span className="text-zinc-400 text-[11px]">{seg.label}:</span>
                              <span className={`font-mono font-semibold ${clr.text}`}>
                                {seg.value}
                              </span>
                              {seg.note && (
                                <span className="text-zinc-500 text-[11px]">
                                  {seg.label === 'Контекст' ? `, ${seg.note}` : `(${seg.note})`}
                                </span>
                              )}
                              {i < currentSegments.length - 1 && (
                                <span className="text-zinc-700 select-none ml-1">·</span>
                              )}
                            </div>
                          )
                        })
                      )}

                      {/* Hide button */}
                      <button
                        type="button"
                        onClick={() => setIsHidden(true)}
                        className="ml-auto text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
                        title="Убрать полосу до конца сеанса"
                      >
                        Скрыть
                      </button>
                    </div>
                  ) : (
                    <div className="mb-2 py-1 px-2 text-[11px] text-zinc-500 italic flex items-center justify-between border border-dashed border-zinc-800 rounded">
                      <span>Полоса скрыта кнопкой «Скрыть»</span>
                      <button
                        type="button"
                        onClick={() => setIsHidden(false)}
                        className="text-amber-400 hover:underline cursor-pointer not-italic font-sans"
                      >
                        Восстановить
                      </button>
                    </div>
                  )}

                  {/* Simulated Prompt Input */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus-within:border-amber-500/80 transition-colors">
                      <span className="text-amber-400 font-mono font-bold">❯</span>
                      <input
                        type="text"
                        value={promptText}
                        onChange={e => setPromptText(e.target.value)}
                        placeholder="Напишите сообщение Claude Code или нажмите 'Отправить'..."
                        className="w-full bg-transparent outline-hidden text-xs text-zinc-100 placeholder-zinc-500 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Отправить</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Exact Line Output Inspector */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between text-zinc-400 mb-1.5 font-mono text-[11px]">
                  <span>Выходное строковое представление line(snapshot, sessionTokens, now):</span>
                  <span className="text-emerald-400 font-medium">hooks/register.tsx</span>
                </div>
                <div className="font-mono bg-zinc-950 p-2.5 rounded border border-zinc-800/80 text-zinc-200 text-xs overflow-x-auto select-all">
                  {currentSummaryLine}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Controls & Live Metrics */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Presets Card */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Готовые сценарии
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => applyPreset('readme')}
                    className="p-2 text-left rounded-lg bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/60 hover:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-zinc-200">Пример из README</div>
                    <div className="text-[11px] text-zinc-400">42% (5ч), 76k токенов</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('critical')}
                    className="p-2 text-left rounded-lg bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 hover:border-rose-500/50 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-rose-300 flex items-center gap-1">
                      <span>Лимит 92%</span>
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                    </div>
                    <div className="text-[11px] text-rose-400/80">Показ toast & красный цвет</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('high_context')}
                    className="p-2 text-left rounded-lg bg-amber-950/30 hover:bg-amber-950/50 border border-amber-800/40 hover:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-amber-300">Плотный контекст</div>
                    <div className="text-[11px] text-amber-400/80">188 тыс. из 200 тыс.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('empty')}
                    className="p-2 text-left rounded-lg bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-zinc-200">Пустой сеанс</div>
                    <div className="text-[11px] text-zinc-400">Нет данных о лимитах</div>
                  </button>
                </div>
              </div>

              {/* Sliders Control Card */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Настройка параметров
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPreset('readme')}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Сброс
                  </button>
                </div>

                {/* 5-hour limit slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">5 часов (five_hour):</span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        COLOR_MAP[level(fiveHourPercent)].badge
                      }`}
                    >
                      {fiveHourPercent}% ({level(fiveHourPercent)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={fiveHourPercent}
                    onChange={e => updateFiveHour(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Сброс через: {Math.floor(fiveHourMinutesLeft / 60)} ч {fiveHourMinutesLeft % 60} мин</span>
                    <button
                      type="button"
                      onClick={() => setFiveHourMinutesLeft(m => (m <= 30 ? 270 : m - 30))}
                      className="text-amber-400 hover:underline"
                    >
                      Изменить время
                    </button>
                  </div>
                </div>

                {/* 7-day limit slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">Неделя (seven_day):</span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        COLOR_MAP[level(sevenDayPercent)].badge
                      }`}
                    >
                      {sevenDayPercent}% ({level(sevenDayPercent)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sevenDayPercent}
                    onChange={e => setSevenDayPercent(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Сброс через: {Math.floor(sevenDayHoursLeft / 24)} д {sevenDayHoursLeft % 24} ч</span>
                  </div>
                </div>

                {/* Context tokens slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">Токены контекста:</span>
                    <span className="font-mono text-zinc-300 font-semibold text-[11px]">
                      {tokens(contextTokens)} / {tokens(contextWindow)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={contextWindow}
                    step="5000"
                    value={contextTokens}
                    onChange={e => setContextTokens(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Осталось: {tokens(Math.max(0, contextWindow - contextTokens))}</span>
                    <span>{Math.round((contextTokens / contextWindow) * 100)}%</span>
                  </div>
                </div>

                {/* Session tokens */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">Токены за сеанс:</span>
                    <span className="font-mono text-sky-400 font-semibold text-[11px]">
                      {tokens(sessionTokens)} токенов
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSessionTokens(s => s + 50000)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700 cursor-pointer"
                    >
                      +50 тыс.
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionTokens(s => s + 250000)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700 cursor-pointer"
                    >
                      +250 тыс.
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionTokens(0)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] border border-zinc-700 cursor-pointer"
                    >
                      Очистить
                    </button>
                  </div>
                </div>
              </div>

              {/* Thresholds Explanation */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400 font-medium mb-2">
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Пороги цветовой индикации</span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400">&lt; 60%</span>
                    <span className="text-zinc-400">ok (зеленый)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">60% – 84%</span>
                    <span className="text-zinc-400">warn (предупреждение)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400">≥ 85%</span>
                    <span className="text-zinc-400">high (критично)</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-zinc-400">
                    <span className="text-rose-300 font-bold">≥ 90% (5 ч)</span>
                    <span className="text-zinc-300">всплывающее уведомление (toast)</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Test Suite Runner */}
        {activeTab === 'tests' && (
          <div className="lg:col-span-12 flex flex-col gap-4">
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Набор автоматических тестов (register.test.ts + band.test.tsx)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Прямое выполнение тестовых сценариев из репозитория на виртуализированном контексте claude-code
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runAllUnitTests}
                  disabled={isRunningTests}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer self-start"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                  Перезапустить все тесты
                </button>
              </div>

              {/* Test summary banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400">Всего тестов</span>
                  <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                    {testResults.length}
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-emerald-900/40">
                  <span className="text-xs text-emerald-400">Пройдено</span>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {testResults.filter(t => t.passed).length}
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-xs text-rose-400">Провалено</span>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                    {testResults.filter(t => !t.passed).length}
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-400">Время выполнения</span>
                  <div className="text-xl font-bold font-mono text-zinc-300 mt-1">
                    {testResults.reduce((acc, t) => acc + t.durationMs, 0)} мс
                  </div>
                </div>
              </div>

              {/* Tests list */}
              <div className="space-y-2 mt-4">
                {testResults.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-lg border flex items-start justify-between gap-4 ${
                      t.passed
                        ? 'bg-zinc-950/60 border-emerald-900/40'
                        : 'bg-rose-950/20 border-rose-800/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {t.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 font-mono">
                          {t.name}
                        </div>
                        {t.error ? (
                          <div className="text-[11px] text-rose-400 mt-1 font-mono">{t.error}</div>
                        ) : (
                          <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                            Все утверждения (assertions) выполнены корректно
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">{t.durationMs}ms</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          t.passed
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {t.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Installation & Documentation */}
        {activeTab === 'install' && (
          <div className="lg:col-span-12 flex flex-col gap-4">
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-amber-400" />
                Установка плагина в Claude Code
              </h2>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Чтобы добавить limits-band в ваш реальный терминал Claude Code, используйте встроенную команду установки плагинов.
              </p>

              {/* Install Command */}
              <div className="mb-6">
                <label className="text-xs font-medium text-zinc-300 block mb-2 font-mono">
                  В поле ввода Claude Code:
                </label>
                <div className="flex items-center gap-2 bg-black border border-zinc-700/80 rounded-lg p-3">
                  <code className="text-amber-400 font-mono text-xs sm:text-sm flex-1 break-all">
                    /plugin install limits-band --marketplace kirsanovyamkino-commits/limits-band
                  </code>
                  <button
                    type="button"
                    onClick={copyInstallCommand}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedInstall ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Копировать
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  На вопрос о добавлении источника ответьте <code className="text-zinc-300 font-mono">y</code>, затем выберите область установки (для себя — user).
                </p>
              </div>

              {/* Features summary */}
              <div className="border-t border-zinc-800 pt-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Особенности работы:</h3>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>
                      <strong>Автоматическое обновление:</strong> полоса пересчитывается после каждого ответа Claude на событии <code className="font-mono text-zinc-400">session.measure</code> и <code className="font-mono text-zinc-400">turn.complete</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>
                      <strong>Предупреждение при 90%:</strong> при достижении 90% пятичасового лимита выводится тост-уведомление через <code className="font-mono text-zinc-400">$.ui.toast</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>
                      <strong>Управление видимостью:</strong> кнопка «Скрыть» в полосе убирает виджет до окончания текущей сессии с помощью атома состояния <code className="font-mono text-zinc-400">isHidden</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>
                      <strong>Умное форматирование токенов:</strong> компактное отображение чисел (например, 76 тыс. вместо 76 000, 1,3 млн вместо 1 300 000).
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-4 px-6 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>limits-band — Claude Code Plugin by kirsanovyamkino-commits</span>
          <span>Node.js Web Runtime • Port 3000</span>
        </div>
      </footer>
    </div>
  )
}
