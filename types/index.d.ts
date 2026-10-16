export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Snapshot = { limits: Limit[]; contextTokens: number | null; contextWindow: number }

declare module 'claude-code' {
  interface PluginState {
    'limits-band': { snap: Snapshot | null; spent: number; isHidden: boolean }
  }
}
