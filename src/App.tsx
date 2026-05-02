import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import confetti from 'canvas-confetti'
import {
  ArrowLeft,
  Medal,
  Play,
  RefreshCcw,
  Sparkles,
  Trophy,
} from 'lucide-react'
import {
  chooseNextProblem,
  createAnswerOptions,
  createInitialWeights,
  evaluateAnswer,
} from './game'
import type { AnswerOptions, Problem, ProblemWeight } from './game'
import {
  isLeaderboardConfigured,
  loadLeaderboard,
  saveLeaderboardEntry,
} from './leaderboard'
import type { LeaderboardEntry } from './leaderboard'

type View = 'home' | 'game' | 'leaderboard'

type GameStats = {
  score: number
  streak: number
  bestStreak: number
  correctAnswers: number
  wrongAnswers: number
  gameSeconds: number
}

type AnswerState = {
  selected: number
  correct: number
  isCorrect: boolean
} | null

const STORAGE_KEY = 'mala-nasobilka-state-v2'
const CELEBRATION_STREAK = 20
const NEXT_PROBLEM_DELAY_MS = 850

function App() {
  const savedState = useMemo(readSavedState, [])
  const [view, setView] = useState<View>('home')
  const [weights, setWeights] = useState<ProblemWeight>(
    savedState?.weights ?? createInitialWeights(),
  )
  const [problem, setProblem] = useState<Problem>(() =>
    chooseNextProblem(savedState?.weights ?? createInitialWeights()),
  )
  const [answerOptions, setAnswerOptions] = useState<AnswerOptions>(() =>
    createAnswerOptions(problem),
  )
  const [answerState, setAnswerState] = useState<AnswerState>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [feedback, setFeedback] = useState('Vyber jednu ze čtyř možností.')
  const [problemStartedAt, setProblemStartedAt] = useState(Date.now())
  const [gameStartedAt, setGameStartedAt] = useState<number | null>(null)
  const [stats, setStats] = useState<GameStats>(
    savedState?.stats ?? {
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      gameSeconds: 0,
    },
  )
  const [celebrationOpen, setCelebrationOpen] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardError, setLeaderboardError] = useState('')
  const [nickname, setNickname] = useState('')
  const [isSavingScore, setIsSavingScore] = useState(false)
  const [hasSavedMilestone, setHasSavedMilestone] = useState(false)

  const progress = Math.min(100, (stats.streak / CELEBRATION_STREAK) * 100)
  const showScoreForm = stats.bestStreak >= CELEBRATION_STREAK
  const canCelebrate = stats.bestStreak >= CELEBRATION_STREAK

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        weights,
        stats,
      }),
    )
  }, [stats, weights])

  useEffect(() => {
    refreshLeaderboard()
  }, [])

  useEffect(() => {
    if (view !== 'game' || gameStartedAt === null) return

    const interval = window.setInterval(() => {
      setStats((current) => ({
        ...current,
        gameSeconds: Math.floor((Date.now() - gameStartedAt) / 1000),
      }))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [gameStartedAt, view])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (view !== 'game' || isResolving) return

      if (/^[1-4]$/.test(event.key)) {
        submitAnswer(answerOptions.values[Number(event.key) - 1])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function startNewGame() {
    const nextWeights = createInitialWeights()
    const nextProblem = chooseNextProblem(nextWeights)

    setWeights(nextWeights)
    setProblem(nextProblem)
    setAnswerOptions(createAnswerOptions(nextProblem))
    setAnswerState(null)
    setIsResolving(false)
    setFeedback('Vyber jednu ze čtyř možností.')
    setProblemStartedAt(Date.now())
    setGameStartedAt(Date.now())
    setStats({
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      gameSeconds: 0,
    })
    setHasSavedMilestone(false)
    setCelebrationOpen(false)
    setView('game')
  }

  function submitAnswer(submittedAnswer: number) {
    if (isResolving) return

    const responseSeconds = (Date.now() - problemStartedAt) / 1000
    const result = evaluateAnswer(
      weights,
      problem,
      submittedAnswer,
      stats.streak,
      responseSeconds,
    )
    const nextStreak = result.isCorrect ? stats.streak + 1 : 0
    const gameSeconds =
      gameStartedAt === null
        ? stats.gameSeconds
        : Math.floor((Date.now() - gameStartedAt) / 1000)

    setIsResolving(true)
    setWeights(result.weights)
    setFeedback(result.feedback)
    setAnswerState({
      selected: submittedAnswer,
      correct: problem.answer,
      isCorrect: result.isCorrect,
    })
    setStats((current) => ({
      score: current.score + result.scoreDelta,
      streak: nextStreak,
      bestStreak: Math.max(current.bestStreak, nextStreak),
      correctAnswers: current.correctAnswers + (result.isCorrect ? 1 : 0),
      wrongAnswers: current.wrongAnswers + (result.isCorrect ? 0 : 1),
      gameSeconds,
    }))
    const currentCorrectIndex = answerOptions.correctIndex

    window.setTimeout(() => {
      const nextProblem = chooseNextProblem(result.weights, problem.id)
      setProblem(nextProblem)
      setAnswerOptions(createAnswerOptions(nextProblem, currentCorrectIndex))
      setAnswerState(null)
      setFeedback('Vyber jednu ze čtyř možností.')
      setProblemStartedAt(Date.now())
      setIsResolving(false)
    }, NEXT_PROBLEM_DELAY_MS)

    if (nextStreak === CELEBRATION_STREAK) {
      window.setTimeout(() => {
        launchCelebration()
        setCelebrationOpen(true)
      }, 250)
    }
  }

  function launchCelebration() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#ff5f6d', '#00b8a9', '#ffd166', '#4d96ff', '#845ec2'],
    })

    window.setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
      })
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
      })
    }, 250)
  }

  async function refreshLeaderboard() {
    setLeaderboardError('')

    try {
      setLeaderboard(await loadLeaderboard())
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : 'Tabulku se nepodařilo načíst.')
    }
  }

  async function handleSaveScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingScore(true)
    setLeaderboardError('')

    try {
      await saveLeaderboardEntry({
        nickname,
        score: stats.score,
        bestStreak: stats.bestStreak,
        correctAnswers: stats.correctAnswers,
        wrongAnswers: stats.wrongAnswers,
        gameSeconds: stats.gameSeconds,
      })
      setHasSavedMilestone(true)
      setNickname('')
      await refreshLeaderboard()
      setView('leaderboard')
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : 'Skóre se nepodařilo uložit.')
    } finally {
      setIsSavingScore(false)
    }
  }

  return (
    <main className="app-shell">
      {view === 'home' ? (
        <HomeScreen
          bestStreak={stats.bestStreak}
          onShowLeaderboard={() => setView('leaderboard')}
          onStartGame={startNewGame}
        />
      ) : null}

      {view === 'game' ? (
        <GameScreen
          answerOptions={answerOptions}
          answerState={answerState}
          canCelebrate={canCelebrate}
          feedback={feedback}
          isResolving={isResolving}
          onBackHome={() => setView('home')}
          onCelebrate={() => {
            launchCelebration()
            setCelebrationOpen(true)
          }}
          onShowLeaderboard={() => setView('leaderboard')}
          onStartGame={startNewGame}
          onSubmitAnswer={submitAnswer}
          problem={problem}
          progress={progress}
          stats={stats}
        />
      ) : null}

      {view === 'leaderboard' ? (
        <LeaderboardScreen
          hasSavedMilestone={hasSavedMilestone}
          isSavingScore={isSavingScore}
          leaderboard={leaderboard}
          leaderboardError={leaderboardError}
          nickname={nickname}
          onBackHome={() => setView('home')}
          onNicknameChange={setNickname}
          onRefresh={refreshLeaderboard}
          onSaveScore={handleSaveScore}
          onStartGame={startNewGame}
          showScoreForm={showScoreForm}
          stats={stats}
        />
      ) : null}

      {celebrationOpen ? (
        <div className="celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
          <div className="celebration-panel">
            <Sparkles size={42} aria-hidden="true" />
            <h2 id="celebration-title">20 správně v řadě!</h2>
            <p>Odemkl/a jsi oslavu a zápis do tabulky hráčů.</p>
            <div className="celebration-actions">
              <button type="button" onClick={() => setCelebrationOpen(false)}>
                Pokračovat
              </button>
              <button
                type="button"
                onClick={() => {
                  setCelebrationOpen(false)
                  setView('leaderboard')
                }}
              >
                Zapsat skóre
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function HomeScreen({
  bestStreak,
  onShowLeaderboard,
  onStartGame,
}: {
  bestStreak: number
  onShowLeaderboard: () => void
  onStartGame: () => void
}) {
  return (
    <section className="welcome-screen" aria-labelledby="welcome-title">
      <div className="welcome-card">
        <div className="orbital-scene" aria-hidden="true">
          <span className="planet planet-main">x</span>
          <span className="planet planet-small">7</span>
          <span className="planet planet-tiny">3</span>
        </div>
        <p className="eyebrow">Malá násobilka</p>
        <h1 id="welcome-title">Vydej se na misi za 20 správnými výsledky.</h1>
        <p className="welcome-copy">
          Hra si pamatuje, které příklady jsou lehké, a ty těžší trénuje častěji.
        </p>
        <div className="welcome-actions">
          <button type="button" className="primary-button" onClick={onStartGame}>
            <Play size={22} />
            Nová hra
          </button>
          <button type="button" className="ghost-button" onClick={onShowLeaderboard}>
            <Trophy size={22} />
            Tabulka skóre
          </button>
        </div>
        <p className="welcome-note">Tvůj nejlepší rekord: {bestStreak} v řadě</p>
      </div>
    </section>
  )
}

function GameScreen({
  answerOptions,
  answerState,
  canCelebrate,
  feedback,
  isResolving,
  onBackHome,
  onCelebrate,
  onShowLeaderboard,
  onStartGame,
  onSubmitAnswer,
  problem,
  progress,
  stats,
}: {
  answerOptions: AnswerOptions
  answerState: AnswerState
  canCelebrate: boolean
  feedback: string
  isResolving: boolean
  onBackHome: () => void
  onCelebrate: () => void
  onShowLeaderboard: () => void
  onStartGame: () => void
  onSubmitAnswer: (answer: number) => void
  problem: Problem
  progress: number
  stats: GameStats
}) {
  return (
    <>
      <nav className="top-nav" aria-label="Navigace hry">
        <button type="button" onClick={onBackHome}>
          <ArrowLeft size={20} />
          Úvod
        </button>
        <button type="button" onClick={onShowLeaderboard}>
          <Trophy size={20} />
          Tabulka
        </button>
      </nav>

      <section className="game-board" aria-label="Aktuální příklad">
        <div className="game-status">
          <StatTile label="Skóre" value={stats.score} />
          <StatTile label="Série" value={stats.streak} />
          <StatTile label="Čas" value={formatTime(stats.gameSeconds)} />
        </div>

        <div className="progress-wrap">
          <div className="progress-label">
            <span>Cesta k oslavě</span>
            <strong>{stats.streak}/{CELEBRATION_STREAK}</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="problem-card">
          <p className="problem-label">Kolik je</p>
          <div className="problem">
            <span>{problem.left}</span>
            <span>x</span>
            <span>{problem.right}</span>
          </div>
          <p className={answerState?.isCorrect === false ? 'feedback feedback-wrong' : 'feedback'}>
            {feedback}
          </p>
        </div>

        <div className="answer-options" aria-label="Možnosti odpovědi">
          {answerOptions.values.map((option, index) => {
            const isSelected = answerState?.selected === option
            const isCorrectAnswer = answerState?.correct === option
            const className = answerState
              ? isCorrectAnswer
                ? 'answer-correct'
                : isSelected
                  ? 'answer-wrong'
                  : 'answer-muted'
              : ''

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                className={className}
                disabled={isResolving}
                onClick={() => onSubmitAnswer(option)}
                aria-label={`Možnost ${index + 1}: ${option}`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </section>

      <section className="actions-row" aria-label="Akce hry">
        <button type="button" className="secondary-button" onClick={onStartGame}>
          <RefreshCcw size={20} />
          Nová hra
        </button>
        {canCelebrate ? (
          <button type="button" className="secondary-button celebrate-button" onClick={onCelebrate}>
            <Sparkles size={20} />
            Oslava
          </button>
        ) : null}
      </section>
    </>
  )
}

function LeaderboardScreen({
  hasSavedMilestone,
  isSavingScore,
  leaderboard,
  leaderboardError,
  nickname,
  onBackHome,
  onNicknameChange,
  onRefresh,
  onSaveScore,
  onStartGame,
  showScoreForm,
  stats,
}: {
  hasSavedMilestone: boolean
  isSavingScore: boolean
  leaderboard: LeaderboardEntry[]
  leaderboardError: string
  nickname: string
  onBackHome: () => void
  onNicknameChange: (value: string) => void
  onRefresh: () => void
  onSaveScore: (event: FormEvent<HTMLFormElement>) => void
  onStartGame: () => void
  showScoreForm: boolean
  stats: GameStats
}) {
  return (
    <>
      <nav className="top-nav" aria-label="Navigace tabulky">
        <button type="button" onClick={onBackHome}>
          <ArrowLeft size={20} />
          Úvod
        </button>
        <button type="button" onClick={onStartGame}>
          <Play size={20} />
          Nová hra
        </button>
      </nav>

      <section className="leaderboard-page" aria-labelledby="leaderboard-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Síň slávy</p>
            <h1 id="leaderboard-title">Tabulka hráčů</h1>
          </div>
          <Trophy size={38} aria-hidden="true" />
        </div>

        {showScoreForm ? (
          <form className="score-form" onSubmit={onSaveScore}>
            <label htmlFor="nickname">Zapsat hráče</label>
            <div className="form-row">
              <input
                id="nickname"
                maxLength={18}
                minLength={2}
                placeholder="Třeba Maty"
                required
                value={nickname}
                onChange={(event) => onNicknameChange(event.target.value)}
              />
              <button type="submit" disabled={isSavingScore || hasSavedMilestone}>
                <Medal size={20} />
                {hasSavedMilestone ? 'Uloženo' : 'Zapsat'}
              </button>
            </div>
            <p className="helper-text">
              Zapíše se skóre {stats.score}, série {stats.bestStreak} a čas{' '}
              {formatTime(stats.gameSeconds)}.
            </p>
          </form>
        ) : (
          <p className="helper-text">
            Zápis se odemkne po 20 správných odpovědích za sebou.
          </p>
        )}

        {!isLeaderboardConfigured ? (
          <p className="warning-text">
            Online tabulka čeká na doplnění Supabase proměnných v GitHubu.
          </p>
        ) : null}
        {leaderboardError ? <p className="error-text">{leaderboardError}</p> : null}

        <ol className="leaderboard-list">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <li key={entry.id}>
                <span className="rank">{index + 1}</span>
                <span>{entry.nickname}</span>
                <strong>{entry.score} bodů</strong>
                <small>
                  {entry.best_streak} v řadě · {formatTime(entry.game_seconds ?? 0)}
                </small>
              </li>
            ))
          ) : (
            <li className="empty-row">
              <span>Zatím tu čeká první šampion.</span>
            </li>
          )}
        </ol>

        <button type="button" className="refresh-button" onClick={onRefresh}>
          Obnovit tabulku
        </button>
      </section>
    </>
  )
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function readSavedState():
  | { weights: ProblemWeight; stats: GameStats }
  | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null

    const parsed = JSON.parse(saved) as { weights: ProblemWeight; stats: Partial<GameStats> }
    return {
      weights: parsed.weights,
      stats: {
        score: parsed.stats.score ?? 0,
        streak: parsed.stats.streak ?? 0,
        bestStreak: parsed.stats.bestStreak ?? 0,
        correctAnswers: parsed.stats.correctAnswers ?? 0,
        wrongAnswers: parsed.stats.wrongAnswers ?? 0,
        gameSeconds: parsed.stats.gameSeconds ?? 0,
      },
    }
  } catch {
    return null
  }
}

export default App
