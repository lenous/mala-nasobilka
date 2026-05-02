export type Problem = {
  id: string
  left: number
  right: number
  answer: number
}

export type ProblemWeight = Record<string, number>

export type AnswerResult = {
  weights: ProblemWeight
  scoreDelta: number
  feedback: string
}

const MIN_WEIGHT = 0.35
const MAX_WEIGHT = 7
const CORRECT_MULTIPLIER = 0.72
const WRONG_MULTIPLIER = 1.85

export const allProblems: Problem[] = Array.from({ length: 10 }, (_, leftIndex) =>
  Array.from({ length: 10 }, (_, rightIndex) => {
    const left = leftIndex + 1
    const right = rightIndex + 1

    return {
      id: `${left}x${right}`,
      left,
      right,
      answer: left * right,
    }
  }),
).flat()

export function createInitialWeights(): ProblemWeight {
  return Object.fromEntries(allProblems.map((problem) => [problem.id, 1]))
}

export function clampWeight(weight: number) {
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weight))
}

export function updateWeights(
  weights: ProblemWeight,
  problemId: string,
  isCorrect: boolean,
): ProblemWeight {
  const currentWeight = weights[problemId] ?? 1
  const nextWeight = isCorrect
    ? currentWeight * CORRECT_MULTIPLIER
    : currentWeight * WRONG_MULTIPLIER + 0.45

  return {
    ...weights,
    [problemId]: clampWeight(nextWeight),
  }
}

export function chooseNextProblem(
  weights: ProblemWeight,
  previousProblemId?: string,
  random = Math.random,
): Problem {
  const candidates =
    allProblems.length > 1
      ? allProblems.filter((problem) => problem.id !== previousProblemId)
      : allProblems

  const totalWeight = candidates.reduce(
    (sum, problem) => sum + (weights[problem.id] ?? 1),
    0,
  )
  let ticket = random() * totalWeight

  for (const problem of candidates) {
    ticket -= weights[problem.id] ?? 1
    if (ticket <= 0) {
      return problem
    }
  }

  return candidates[candidates.length - 1]
}

export function createAnswerOptions(
  problem: Problem,
  random = Math.random,
): number[] {
  const nearbyAnswers = Array.from(
    new Set(
      allProblems
        .map((item) => item.answer)
        .filter((answer) => answer !== problem.answer),
    ),
  ).sort(
    (first, second) =>
      Math.abs(first - problem.answer) - Math.abs(second - problem.answer),
  )

  const distractors = pickRandomItems(nearbyAnswers.slice(0, 14), 3, random)
  return shuffleNumbers([problem.answer, ...distractors], random)
}

export function evaluateAnswer(
  weights: ProblemWeight,
  problem: Problem,
  submittedAnswer: number,
  streak: number,
): AnswerResult {
  const isCorrect = submittedAnswer === problem.answer
  const nextStreak = isCorrect ? streak + 1 : 0

  if (!isCorrect) {
    return {
      weights: updateWeights(weights, problem.id, false),
      scoreDelta: 0,
      feedback: `Skoro! ${problem.left} x ${problem.right} je ${problem.answer}.`,
    }
  }

  return {
    weights: updateWeights(weights, problem.id, true),
    scoreDelta: 10 + Math.min(20, nextStreak),
    feedback:
      nextStreak >= 20
        ? 'Paráda! 20 správných odpovědí v řadě!'
        : encouragementFor(nextStreak),
  }
}

function encouragementFor(streak: number) {
  if (streak >= 15) return 'Už jsi skoro u velké oslavy!'
  if (streak >= 10) return 'Desítka v řadě, to je jízda!'
  if (streak >= 5) return 'Skvělá série, jen tak dál!'
  return 'Správně!'
}

function pickRandomItems(items: number[], count: number, random: () => number) {
  const pool = [...items]
  const picked: number[] = []

  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }

  return picked
}

function shuffleNumbers(items: number[], random: () => number) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}
