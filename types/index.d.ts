export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Snapshot = { limits: Limit[]; contextPercent: number | null }

declare module 'claude-code' {
  interface PluginState {
    'limits-band': { snap: Snapshot | null; isHidden: boolean }
  }
}
