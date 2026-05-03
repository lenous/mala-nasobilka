import { describe, expect, it } from 'vitest'
import {
  allProblems,
  chooseNextProblem,
  createAnswerOptions,
  createInitialWeights,
  evaluateAnswer,
  getProblemsForMultipliers,
  updateWeights,
} from './game'

describe('game engine', () => {
  it('creates the full 1x1 to 10x10 multiplication set', () => {
    expect(allProblems).toHaveLength(100)
    expect(allProblems.find((problem) => problem.id === '10x10')?.answer).toBe(100)
  })

  it('reduces weight after a fast correct answer and raises it after a wrong answer', () => {
    const weights = createInitialWeights()
    const afterCorrect = updateWeights(weights, '7x8', true, 2)
    const afterWrong = updateWeights(afterCorrect, '7x8', false, 3)

    expect(afterCorrect['7x8']).toBeLessThan(weights['7x8'])
    expect(afterWrong['7x8']).toBeGreaterThan(afterCorrect['7x8'])
  })

  it('raises weight after a slow answer even when it is correct', () => {
    const weights = createInitialWeights()
    const afterSlowCorrect = updateWeights(weights, '6x9', true, 10)

    expect(afterSlowCorrect['6x9']).toBeGreaterThan(weights['6x9'])
  })

  it('prefers a high-weight problem when random points to its range', () => {
    const weights = createInitialWeights()
    weights['10x10'] = 7

    const selected = chooseNextProblem(weights, undefined, () => 0.98)

    expect(selected.id).toBe('10x10')
  })

  it('filters problems to selected multiplication tables', () => {
    const problems = getProblemsForMultipliers([3, 7])

    expect(problems).toHaveLength(20)
    expect(problems.every((problem) => problem.left === 3 || problem.left === 7)).toBe(true)
    expect(problems.some((problem) => problem.id === '3x10')).toBe(true)
    expect(problems.some((problem) => problem.id === '7x8')).toBe(true)
  })

  it('chooses the next problem only from selected multiplication tables', () => {
    const problems = getProblemsForMultipliers([4])
    const weights = createInitialWeights(problems)

    const selected = chooseNextProblem(weights, undefined, () => 0.5, problems)

    expect(selected.left).toBe(4)
  })

  it('scores correct answers and leaves wrong answers without points', () => {
    const problem = allProblems.find((item) => item.id === '6x7')!
    const weights = createInitialWeights()

    const correct = evaluateAnswer(weights, problem, 42, 4, 5)
    const wrong = evaluateAnswer(weights, problem, 41, 4, 5)

    expect(correct.scoreDelta).toBe(15)
    expect(correct.feedback).toContain('Skv')
    expect(wrong.scoreDelta).toBe(0)
    expect(wrong.feedback).toContain('42')
  })

  it('creates four unique answer options including the correct result', () => {
    const problem = allProblems.find((item) => item.id === '8x9')!
    const options = createAnswerOptions(problem, undefined, () => 0.42)

    expect(options.values).toHaveLength(4)
    expect(new Set(options.values).size).toBe(4)
    expect(options.values).toContain(72)
  })

  it('does not place the correct answer on the previous button when possible', () => {
    const problem = allProblems.find((item) => item.id === '8x9')!
    const options = createAnswerOptions(problem, 2, () => 0.5)

    expect(options.correctIndex).not.toBe(2)
    expect(options.values[options.correctIndex]).toBe(72)
  })
})
