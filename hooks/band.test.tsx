import { test, expect } from 'claude-code/testing'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`полоса рисуется: ${surface}`, async ($, on) => {
    on('session.measure', () => ({ changed: [] }) as never)
    on('clock.now', () => ({ value: Date.parse('2026-10-17T10:00:00Z') }) as never)
    on('turn.complete', () => ({
      text: '',
      usage: { input_tokens: 1_000_000, output_tokens: 250_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    }) as never)
    await $.session.measure({
      context: { tokens: 90_000, window: 200_000, percent: 45 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 72, resetsAt: '2099-01-01T00:00:00Z' }],
    } as never)
    await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1' } as never)
    const m = await $.ui.mount({
      plugin: 'limits-band',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false } as never,
    })
    const tree = JSON.stringify(await m.drawn())
    expect(tree).toContain('72%')
    expect(tree).toContain('warning')
    expect(tree).toContain('90 тыс. из 200 тыс.')
    expect(tree).toContain('1,3 млн токенов')
    expect(await m.find({ key: 'hide' } as never)).toBeTruthy()
  })
}
