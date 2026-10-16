import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit, Snapshot } from '../types'

const snap = atom({ plugin: 'limits-band', key: 'snap' } as const, null)
const spent = atom({ plugin: 'limits-band', key: 'spent' } as const, 0)
const isHidden = atom({ plugin: 'limits-band', key: 'isHidden' } as const, false)

const NAMES: Record<string, string> = {
  five_hour: '5 ч',
  seven_day: 'Неделя',
  spend_limit: 'Бюджет',
}

export const label = (kind: string): string => NAMES[kind] ?? kind

export const tokens = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} млн`
  if (n >= 1000) return `${Math.round(n / 1000)} тыс.`
  return String(n)
}

export const untilReset = (resetsAt: string | undefined, now: number): string => {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const min = Math.round(ms / 60000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `сброс через ${d} д ${h} ч`
  if (h > 0) return `сброс через ${h} ч ${m} мин`
  return `сброс через ${m} мин`
}

export const line = (s: Snapshot, sessionTokens: number, now: number): string => {
  const parts = (s.limits ?? []).map((l: Limit) => {
    const reset = untilReset(l.resetsAt, now)
    return `${label(l.kind)}: ${l.percentUsed}%${reset ? ` (${reset})` : ''}`
  })
  if (typeof s.contextTokens === 'number' && s.contextWindow > 0) {
    const left = Math.max(0, s.contextWindow - s.contextTokens)
    parts.push(`Контекст: ${tokens(s.contextTokens)} из ${tokens(s.contextWindow)}, осталось ${tokens(left)}`)
  }
  if (sessionTokens > 0) parts.push(`За сеанс: ${tokens(sessionTokens)} токенов`)
  return parts.length ? parts.join(' · ') : 'Лимиты: данных пока нет'
}

type Ctx = { tokens?: number; window: number }

const toSnap = (rateLimits: readonly Limit[], ctx: Ctx): Snapshot => ({
  limits: rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
  contextTokens: ctx.tokens ?? null,
  contextWindow: ctx.window,
})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage()
    await update($, snap, () => toSnap(u.rateLimits, u.context))
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, snap, () => toSnap(e.rateLimits, e.context))
    const five = e.rateLimits.find(l => l.kind === 'five_hour')
    if (five && five.percentUsed >= 90) $.ui.toast(`Лимит 5 часов: ${five.percentUsed}%`)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = result.usage
    if (u) {
      const n = u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      await update($, spent, total => total + n)
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, snap)
    if (e.props.hasSurvey || s === null || (await read($, isHidden))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const sessionTokens = await read($, spent)

    return (
      <Box>
        <Text dimColor>{line(s, sessionTokens, now)} </Text>
        <Button key="hide" label="Скрыть" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
