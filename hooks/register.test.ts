import { test, expect } from 'claude-code/testing'
import { label, line, untilReset } from './register'

const now = Date.parse('2026-10-17T10:00:00Z')

test('названия окон', () => {
  expect(label('five_hour')).toBe('5 ч')
  expect(label('seven_day')).toBe('Неделя')
})

test('время до сброса', () => {
  expect(untilReset('2026-10-17T12:30:00Z', now)).toBe('сброс через 2 ч 30 мин')
  expect(untilReset('2026-10-19T13:00:00Z', now)).toBe('сброс через 2 д 3 ч')
  expect(untilReset(undefined, now)).toBe('')
})

test('строка полосы', () => {
  expect(line({ limits: [{ kind: 'five_hour', percentUsed: 42, resetsAt: '2026-10-17T11:00:00Z' }], contextPercent: 37.6 }, now))
    .toBe('5 ч: 42% (сброс через 1 ч 0 мин) · Контекст: 38%')
  expect(line({ limits: [], contextPercent: null }, now)).toBe('Лимиты: данных пока нет')
})
