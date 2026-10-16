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

export type Level = 'ok' | 'warn' | 'high' | 'info'
export type Segment = { label: string; value: string; note: string; level: Level }

export const label = (kind: string): string => NAMES[kind] ?? kind

export const level = (percent: number): Level => (percent >= 85 ? 'high' : percent >= 60 ? 'warn' : 'ok')

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

export const segments = (s: Snapshot, sessionTokens: number, now: number): Segment[] => {
  const out: Segment[] = (s.limits ?? []).map((l: Limit) => ({
    label: label(l.kind),
    value: `${l.percentUsed}%`,
    note: untilReset(l.resetsAt, now),
    level: level(l.percentUsed),
  }))
  if (typeof s.contextTokens === 'number' && s.contextWindow > 0) {
    const left = Math.max(0, s.contextWindow - s.contextTokens)
    out.push({
      label: 'Контекст',
      value: `${tokens(s.contextTokens)} из ${tokens(s.contextWindow)}`,
      note: `осталось ${tokens(left)}`,
      level: level((s.contextTokens / s.contextWindow) * 100),
    })
  }
  if (sessionTokens > 0) {
    out.push({ label: 'За сеанс', value: `${tokens(sessionTokens)} токенов`, note: '', level: 'info' })
  }
  return out
}

export const line = (s: Snapshot, sessionTokens: number, now: number): string => {
  const parts = segments(s, sessionTokens, now).map(g =>
    g.label === 'Контекст' || g.label === 'За сеанс'
      ? `${g.label}: ${g.value}${g.note ? `, ${g.note}` : ''}`
      : `${g.label}: ${g.value}${g.note ? ` (${g.note})` : ''}`,
  )
  return parts.length ? parts.join(' · ') : 'Лимиты: данных пока нет'
}

const COLOR: Record<Level, string> = { ok: 'success', warn: 'warning', high: 'error', info: 'suggestion' }

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
    const segs = segments(s, await read($, spent), now)

    return (
      <Box
        flexDirection="row"
        flexWrap="wrap"
        alignItems="center"
        columnGap={2}
        borderStyle="round"
        borderColor="subtle"
        paddingX={1}
      >
        {segs.length === 0 ? (
          <Text color="subtle">Лимиты: данных пока нет</Text>
        ) : (
          segs.map((g, i) => (
            <Box key={`seg-${i}`} flexDirection="row" columnGap={1}>
              <Text color="subtle" size="footnote">{g.label}</Text>
              <Text color={COLOR[g.level]} weight="semibold" tabular>{g.value}</Text>
              {g.note ? <Text color="inactive" size="footnote">{g.note}</Text> : null}
            </Box>
          ))
        )}
        <Button key="hide" label="Скрыть" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
