import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit, Snapshot } from '../types'

const snap = atom({ plugin: 'limits-band', key: 'snap' } as const, null)
const isHidden = atom({ plugin: 'limits-band', key: 'isHidden' } as const, false)

const NAMES: Record<string, string> = {
  five_hour: '5 ч',
  seven_day: 'Неделя',
  spend_limit: 'Бюджет',
}

export const label = (kind: string): string => NAMES[kind] ?? kind

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

export const line = (s: Snapshot, now: number): string => {
  const parts = s.limits.map((l: Limit) => {
    const reset = untilReset(l.resetsAt, now)
    return `${label(l.kind)}: ${l.percentUsed}%${reset ? ` (${reset})` : ''}`
  })
  if (s.contextPercent !== null) parts.push(`Контекст: ${Math.round(s.contextPercent)}%`)
  return parts.length ? parts.join(' · ') : 'Лимиты: данных пока нет'
}

const toSnap = (rateLimits: readonly Limit[], percent: number | undefined): Snapshot => ({
  limits: rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
  contextPercent: percent ?? null,
})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage()
    await update($, snap, () => toSnap(u.rateLimits, u.context.percent))
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, snap, () => toSnap(e.rateLimits, e.context.percent))
    const five = e.rateLimits.find(l => l.kind === 'five_hour')
    if (five && five.percentUsed >= 90) $.ui.toast(`Лимит 5 часов: ${five.percentUsed}%`)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, snap)
    if (e.props.hasSurvey || s === null || (await read($, isHidden))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const now = await $.clock.now()

    return (
      <Box>
        <Text dimColor>{line(s, now)} </Text>
        <Button key="hide" label="Скрыть" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
