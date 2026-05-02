import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import confetti from 'canvas-confetti'
import {
  Medal,
  RefreshCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import {
  chooseNextProblem,
  createAnswerOptions,
  createInitialWeights,
  evaluateAnswer,
} from './game'
import type { Problem, ProblemWeight } from './game'
import {
  isLeaderboardConfigured,
  loadLeaderboard,
  saveLeaderboardEntry,
} from './leaderboard'
import type { LeaderboardEntry } from './leaderboard'

type GameStats = {
  score: number
  streak: number
  bestStreak: number
  correctAnswers: number
  wrongAnswers: number
}

const STORAGE_KEY = 'mala-nasobilka-state-v1'
const CELEBRATION_STREAK = 20

function App() {
  const savedState = useMemo(readSavedState, [])
  const [weights, setWeights] = useState<ProblemWeight>(
    savedState?.weights ?? createInitialWeights(),
  )
  const [problem, setProblem] = useState<Problem>(() =>
    chooseNextProblem(savedState?.weights ?? createInitialWeights()),
  )
  const [feedback, setFeedback] = useState('Začni a sbírej hvězdy za správné odpovědi.')
  const [stats, setStats] = useState<GameStats>(
    savedState?.stats ?? {
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    },
  )
  const [celebrationOpen, setCelebrationOpen] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardError, setLeaderboardError] = useState('')
  const [nickname, setNickname] = useState('')
  const [isSavingScore, setIsSavingScore] = useState(false)
  const [hasSavedMilestone, setHasSavedMilestone] = useState(false)

  const answerOptions = useMemo(() => createAnswerOptions(problem), [problem])
  const progress = Math.min(100, (stats.streak / CELEBRATION_STREAK) * 100)
  const showScoreForm = stats.bestStreak >= CELEBRATION_STREAK

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^[1-4]$/.test(event.key)) {
        submitAnswer(answerOptions[Number(event.key) - 1])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function submitAnswer(submittedAnswer: number) {
    const result = evaluateAnswer(weights, problem, submittedAnswer, stats.streak)
    const isCorrect = submittedAnswer === problem.answer
    const nextStreak = isCorrect ? stats.streak + 1 : 0

    setWeights(result.weights)
    setFeedback(result.feedback)
    setStats((current) => ({
      score: current.score + result.scoreDelta,
      streak: nextStreak,
      bestStreak: Math.max(current.bestStreak, nextStreak),
      correctAnswers: current.correctAnswers + (isCorrect ? 1 : 0),
      wrongAnswers: current.wrongAnswers + (isCorrect ? 0 : 1),
    }))
    setProblem(chooseNextProblem(result.weights, problem.id))

    if (nextStreak === CELEBRATION_STREAK) {
      launchCelebration()
      setCelebrationOpen(true)
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

  function resetGame() {
    const nextWeights = createInitialWeights()
    setWeights(nextWeights)
    setProblem(chooseNextProblem(nextWeights))
    setFeedback('Nové kolo je připravené.')
    setStats({
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    })
    setHasSavedMilestone(false)
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
      })
      setHasSavedMilestone(true)
      setNickname('')
      await refreshLeaderboard()
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : 'Skóre se nepodařilo uložit.')
    } finally {
      setIsSavingScore(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-band" aria-labelledby="app-title">
        <div className="hero-copy">
          <p className="eyebrow">Malá násobilka</p>
          <h1 id="app-title">Hvězdný trénink násobilky</h1>
          <p>
            Správné příklady mizí z cesty, ty záludné se vrací častěji. Nasbírej
            20 správných odpovědí v řadě a odemkni oslavu.
          </p>
        </div>

        <div className="mascot" aria-hidden="true">
          <div className="mascot-face">
            <span className="eye left-eye" />
            <span className="eye right-eye" />
            <span className="smile" />
          </div>
          <Sparkles className="sparkle sparkle-one" size={30} />
          <Star className="sparkle sparkle-two" size={24} />
        </div>
      </section>

      <section className="score-strip" aria-label="Skóre hry">
        <StatTile label="Skóre" value={stats.score} />
        <StatTile label="Série" value={stats.streak} />
        <StatTile label="Rekord" value={stats.bestStreak} />
      </section>

      <section className="game-board" aria-label="Aktuální příklad">
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
          <div className="answer-display" aria-live="polite">
            Vyber výsledek
          </div>
          <p className="feedback">{feedback}</p>
        </div>

        <div className="answer-options" aria-label="Možnosti odpovědi">
          {answerOptions.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => submitAnswer(option)}
              aria-label={`Možnost ${index + 1}: ${option}`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="actions-row" aria-label="Akce hry">
        <button type="button" className="secondary-button" onClick={resetGame}>
          <RefreshCcw size={20} />
          Nová hra
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            launchCelebration()
            setCelebrationOpen(true)
          }}
        >
          <Sparkles size={20} />
          Oslava
        </button>
      </section>

      <section className="leaderboard-section" aria-labelledby="leaderboard-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Síň slávy</p>
            <h2 id="leaderboard-title">Tabulka skóre</h2>
          </div>
          <Trophy size={34} aria-hidden="true" />
        </div>

        {showScoreForm ? (
          <form className="score-form" onSubmit={handleSaveScore}>
            <label htmlFor="nickname">Přezdívka</label>
            <div className="form-row">
              <input
                id="nickname"
                maxLength={18}
                minLength={2}
                placeholder="Třeba Maty"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
              <button type="submit" disabled={isSavingScore || hasSavedMilestone}>
                <Medal size={20} />
                {hasSavedMilestone ? 'Uloženo' : 'Zapsat'}
              </button>
            </div>
            {!isLeaderboardConfigured ? (
              <p className="helper-text">
                Online zápis se zapne po doplnění Supabase proměnných.
              </p>
            ) : null}
          </form>
        ) : (
          <p className="helper-text">
            Zápis se odemkne po 20 správných odpovědích za sebou.
          </p>
        )}

        {leaderboardError ? <p className="error-text">{leaderboardError}</p> : null}

        <ol className="leaderboard-list">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry) => (
              <li key={entry.id}>
                <span>{entry.nickname}</span>
                <strong>{entry.score} bodů</strong>
                <small>{entry.best_streak} v řadě</small>
              </li>
            ))
          ) : (
            <li className="empty-row">
              <span>Zatím tu čeká první šampion.</span>
            </li>
          )}
        </ol>
      </section>

      {celebrationOpen ? (
        <div className="celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
          <div className="celebration-panel">
            <Sparkles size={42} aria-hidden="true" />
            <h2 id="celebration-title">20 správně v řadě!</h2>
            <p>Tohle je parádní výkon. Teď se můžeš zapsat do tabulky skóre.</p>
            <button type="button" onClick={() => setCelebrationOpen(false)}>
              Jdu dál
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function readSavedState():
  | { weights: ProblemWeight; stats: GameStats }
  | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export default App
