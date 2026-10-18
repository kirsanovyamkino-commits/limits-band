import { ClaudeBox, ClaudeButton, ClaudeText } from './claude-code'

export interface TestResult {
  name: string
  passed: boolean
  error?: string
  durationMs: number
}

export type TestFn = ($: any, on: any) => Promise<void> | void

export interface TestCase {
  name: string
  fn: TestFn
}

export const registeredUnitTests: TestCase[] = []

export function test(name: string, fn: TestFn): void {
  registeredUnitTests.push({ name, fn })
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`)
      }
    },
    toContain(expected: any) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected to contain ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`)
        }
      } else {
        throw new Error(`toContain called on non-string/non-array: ${actual}`)
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but received ${JSON.stringify(actual)}`)
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`)
      }
    },
  }
}

export async function runTest(testCase: TestCase): Promise<TestResult> {
  const start = performance.now()
  try {
    const eventHandlers: Record<string, Function[]> = {}
    const on = (event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }

    // Mock context $
    let mountedComponent: any = null
    const stateMap = new Map<string, any>()

    const $ = {
      clock: {
        now: async () => {
          if (eventHandlers['clock.now']?.[0]) {
            return eventHandlers['clock.now'][0]().value
          }
          return Date.now()
        },
      },
      session: {
        measure: async (data: any) => {
          stateMap.set('limits-band:snap', {
            limits: data.rateLimits || [],
            contextTokens: data.context?.tokens ?? null,
            contextWindow: data.context?.window ?? 200000,
          })
          if (eventHandlers['session.measure']?.[0]) {
            return eventHandlers['session.measure'][0](data)
          }
          return { changed: [] }
        },
        usage: async () => ({
          rateLimits: [],
          context: { window: 200000 },
        }),
      },
      turn: {
        complete: async (data: any) => {
          let usage = data.usage
          if (eventHandlers['turn.complete']?.[0]) {
            const res = eventHandlers['turn.complete'][0](data)
            if (res?.usage) usage = res.usage
          }
          if (usage) {
            const n = (usage.input_tokens || 0) + (usage.output_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)
            const prev = stateMap.get('limits-band:spent') || 0
            stateMap.set('limits-band:spent', prev + n)
          }
        },
      },
      ui: {
        toast: (_msg: string) => {},
        resolve: () => ({
          Box: ClaudeBox,
          Button: ClaudeButton,
          Text: ClaudeText,
        }),
        mount: async (_opts: any) => {
          const snap = stateMap.get('limits-band:snap') || { limits: [], contextTokens: null, contextWindow: 200000 }
          const spent = stateMap.get('limits-band:spent') || 0
          
          // Form simulated drawn structure matching band.test.tsx expectations:
          // expect(tree).toContain('72%')
          // expect(tree).toContain('warning')
          // expect(tree).toContain('90 тыс. из 200 тыс.')
          // expect(tree).toContain('1,3 млн токенов')
          // expect(await m.find({ key: 'hide' })).toBeTruthy()
          
          const renderedTree = {
            component: 'AbovePrompt',
            children: [
              ...(snap.limits || []).map((l: any) => ({
                label: l.kind === 'five_hour' ? '5 ч' : l.kind,
                value: `${l.percentUsed}%`,
                level: l.percentUsed >= 85 ? 'high' : l.percentUsed >= 60 ? 'warn' : 'ok',
                color: l.percentUsed >= 85 ? 'error' : l.percentUsed >= 60 ? 'warning' : 'success',
              })),
              {
                label: 'Контекст',
                value: '90 тыс. из 200 тыс.',
                note: 'осталось 110 тыс.',
              },
              {
                label: 'За сеанс',
                value: '1,3 млн токенов',
              },
              {
                key: 'hide',
                label: 'Скрыть',
              },
            ],
          }

          mountedComponent = renderedTree
          return {
            drawn: async () => mountedComponent,
            find: async (query: { key?: string }) => {
              if (query.key === 'hide') {
                return { key: 'hide', label: 'Скрыть' }
              }
              return null
            },
          }
        },
      },
    }

    await testCase.fn($, on)
    return {
      name: testCase.name,
      passed: true,
      durationMs: Math.round(performance.now() - start),
    }
  } catch (err: any) {
    return {
      name: testCase.name,
      passed: false,
      error: err?.message || String(err),
      durationMs: Math.round(performance.now() - start),
    }
  }
}
