import { test, expect } from 'claude-code/testing'
import { label, level, line, tokens, untilReset } from './register'

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

test('формат токенов', () => {
  expect(tokens(950)).toBe('950')
  expect(tokens(76_400)).toBe('76 тыс.')
  expect(tokens(1_000_000)).toBe('1 млн')
  expect(tokens(1_250_000)).toBe('1,3 млн')
})

test('строка полосы', () => {
  const s = {
    limits: [{ kind: 'five_hour', percentUsed: 42, resetsAt: '2026-10-17T11:00:00Z' }],
    contextTokens: 76_000,
    contextWindow: 200_000,
  }
  expect(line(s, 1_250_000, now)).toBe(
    '5 ч: 42% (сброс через 1 ч 0 мин) · Контекст: 76 тыс. из 200 тыс., осталось 124 тыс. · За сеанс: 1,3 млн токенов',
  )
  expect(line({ limits: [], contextTokens: null, contextWindow: 200_000 }, 0, now)).toBe('Лимиты: данных пока нет')
})

test('цвет по заполнению', () => {
  expect(level(30)).toBe('ok')
  expect(level(60)).toBe('warn')
  expect(level(90)).toBe('high')
})
