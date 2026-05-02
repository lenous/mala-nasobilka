import { describe, expect, it } from 'vitest'
import {
  allProblems,
  chooseNextProblem,
  createAnswerOptions,
  createInitialWeights,
  evaluateAnswer,
  updateWeights,
} from './game'

describe('game engine', () => {
  it('creates the full 1x1 to 10x10 multiplication set', () => {
    expect(allProblems).toHaveLength(100)
    expect(allProblems.find((problem) => problem.id === '10x10')?.answer).toBe(100)
  })

  it('reduces weight after a correct answer and raises it after a wrong answer', () => {
    const weights = createInitialWeights()
    const afterCorrect = updateWeights(weights, '7x8', true)
    const afterWrong = updateWeights(afterCorrect, '7x8', false)

    expect(afterCorrect['7x8']).toBeLessThan(weights['7x8'])
    expect(afterWrong['7x8']).toBeGreaterThan(afterCorrect['7x8'])
  })

  it('prefers a high-weight problem when random points to its range', () => {
    const weights = createInitialWeights()
    weights['10x10'] = 7

    const selected = chooseNextProblem(weights, undefined, () => 0.98)

    expect(selected.id).toBe('10x10')
  })

  it('scores correct answers and leaves wrong answers without points', () => {
    const problem = allProblems.find((item) => item.id === '6x7')!
    const weights = createInitialWeights()

    const correct = evaluateAnswer(weights, problem, 42, 4)
    const wrong = evaluateAnswer(weights, problem, 41, 4)

    expect(correct.scoreDelta).toBe(15)
    expect(correct.feedback).toContain('Skv')
    expect(wrong.scoreDelta).toBe(0)
    expect(wrong.feedback).toContain('42')
  })

  it('creates four unique answer options including the correct result', () => {
    const problem = allProblems.find((item) => item.id === '8x9')!
    const options = createAnswerOptions(problem, () => 0.42)

    expect(options).toHaveLength(4)
    expect(new Set(options).size).toBe(4)
    expect(options).toContain(72)
  })
})
