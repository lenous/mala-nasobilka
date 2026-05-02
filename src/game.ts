export type Problem = {
  id: string
  left: number
  right: number
  answer: number
}

export type ProblemWeight = Record<string, number>

export type AnswerOptions = {
  values: number[]
  correctIndex: number
}

export type AnswerResult = {
  weights: ProblemWeight
  scoreDelta: number
  feedback: string
  isCorrect: boolean
}

const MIN_WEIGHT = 0.3
const MAX_WEIGHT = 9
const FAST_SECONDS = 4
const SLOW_SECONDS = 8

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
  responseSeconds = 0,
): ProblemWeight {
  const currentWeight = weights[problemId] ?? 1
  let nextWeight: number

  if (!isCorrect) {
    nextWeight =
      responseSeconds >= SLOW_SECONDS
        ? currentWeight * 2.15 + 0.65
        : currentWeight * 1.85 + 0.45
  } else if (responseSeconds <= FAST_SECONDS) {
    nextWeight = currentWeight * 0.55
  } else if (responseSeconds >= SLOW_SECONDS) {
    nextWeight = currentWeight * 1.25 + 0.2
  } else {
    nextWeight = currentWeight * 0.82
  }

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
  previousCorrectIndex?: number,
  random = Math.random,
): AnswerOptions {
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

  const distractors = pickRandomItems(nearbyAnswers.slice(0, 16), 3, random)
  const correctIndex = chooseCorrectIndex(previousCorrectIndex, random)
  const shuffledDistractors = shuffleNumbers(distractors, random)
  const values: number[] = []

  for (let index = 0; index < 4; index += 1) {
    values[index] =
      index === correctIndex ? problem.answer : shuffledDistractors.shift() ?? problem.answer
  }

  return { values, correctIndex }
}

export function evaluateAnswer(
  weights: ProblemWeight,
  problem: Problem,
  submittedAnswer: number,
  streak: number,
  responseSeconds = 0,
): AnswerResult {
  const isCorrect = submittedAnswer === problem.answer
  const nextStreak = isCorrect ? streak + 1 : 0

  if (!isCorrect) {
    return {
      weights: updateWeights(weights, problem.id, false, responseSeconds),
      scoreDelta: 0,
      feedback: `Pozor, správně je ${problem.answer}.`,
      isCorrect,
    }
  }

  return {
    weights: updateWeights(weights, problem.id, true, responseSeconds),
    scoreDelta: 10 + Math.min(20, nextStreak),
    feedback:
      nextStreak >= 20
        ? 'Paráda! 20 správných odpovědí v řadě!'
        : encouragementFor(nextStreak, responseSeconds),
    isCorrect,
  }
}

function encouragementFor(streak: number, responseSeconds: number) {
  if (streak >= 15) return 'Už jsi skoro u velké oslavy!'
  if (streak >= 10) return 'Desítka v řadě, to je jízda!'
  if (responseSeconds <= FAST_SECONDS) return 'Bleskově správně!'
  if (streak >= 5) return 'Skvělá série, jen tak dál!'
  return 'Správně!'
}

function chooseCorrectIndex(previousCorrectIndex: number | undefined, random: () => number) {
  const indexes = [0, 1, 2, 3].filter((index) => index !== previousCorrectIndex)
  return indexes[Math.floor(random() * indexes.length)]
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
