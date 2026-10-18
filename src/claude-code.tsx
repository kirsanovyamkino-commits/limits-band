import React from 'react'

export interface AtomDescriptor<T = any> {
  plugin: string
  key: string
  initialValue?: T
}

export interface ClaudeCodeContext {
  session: {
    usage: () => Promise<{
      rateLimits: Array<{ kind: string; percentUsed: number; resetsAt?: string }>
      context: { tokens?: number; window: number }
    }>
    measure?: (data: any) => Promise<any>
  }
  ui: {
    toast: (message: string) => void
    resolve: (e: any) => {
      Box: React.FC<any>
      Button: React.FC<any>
      Text: React.FC<any>
    }
    mount?: (opts: any) => Promise<{
      drawn: () => Promise<any>
      find: (query: { key?: string }) => Promise<any>
    }>
  }
  clock: {
    now: () => Promise<number> | number
  }
  turn?: {
    complete: (data: any) => Promise<any>
  }
  _state?: Map<string, any>
}

// Global or context-bound storage for atoms
const globalStore = new Map<string, any>()

export function atom<T>(descriptor: { plugin: string; key: string }, initialValue: T): AtomDescriptor<T> {
  const storeKey = `${descriptor.plugin}:${descriptor.key}`
  if (!globalStore.has(storeKey)) {
    globalStore.set(storeKey, initialValue)
  }
  return { ...descriptor, initialValue }
}

export async function read<T>(ctx: ClaudeCodeContext, descriptor: AtomDescriptor<T>): Promise<T> {
  const storeKey = `${descriptor.plugin}:${descriptor.key}`
  if (ctx?._state && ctx._state.has(storeKey)) {
    return ctx._state.get(storeKey)
  }
  if (globalStore.has(storeKey)) {
    return globalStore.get(storeKey)
  }
  return descriptor.initialValue as T
}

export async function update<T>(
  ctx: ClaudeCodeContext,
  descriptor: AtomDescriptor<T>,
  updater: (prev: T) => T
): Promise<T> {
  const storeKey = `${descriptor.plugin}:${descriptor.key}`
  const prev = await read(ctx, descriptor)
  const nextVal = updater(prev)
  if (ctx?._state) {
    ctx._state.set(storeKey, nextVal)
  }
  globalStore.set(storeKey, nextVal)
  return nextVal
}

export function resetAtomStore(): void {
  globalStore.clear()
}

export type HookHandler = ($: ClaudeCodeContext, e: any, next: (e: any) => Promise<any>) => Promise<any>

export interface OnFunction {
  (event: string, handler: HookHandler): void
  (event: string, filter: Record<string, any>, handler: HookHandler): void
}

export type Register = (on: OnFunction) => void

// Standard UI components resolved by $.ui.resolve()
export const ClaudeBox: React.FC<any> = ({
  children,
  flexDirection = 'row',
  flexWrap = 'nowrap',
  alignItems = 'stretch',
  columnGap = 0,
  rowGap = 0,
  borderStyle,
  borderColor,
  paddingX = 0,
  paddingY = 0,
  className = '',
  ...props
}) => {
  const styles: React.CSSProperties = {
    display: 'flex',
    flexDirection: flexDirection === 'column' ? 'column' : 'row',
    flexWrap: flexWrap === 'wrap' ? 'wrap' : 'nowrap',
    alignItems: alignItems === 'center' ? 'center' : alignItems === 'stretch' ? 'stretch' : 'flex-start',
    columnGap: typeof columnGap === 'number' ? `${columnGap * 0.5}rem` : columnGap,
    rowGap: typeof rowGap === 'number' ? `${rowGap * 0.5}rem` : rowGap,
    paddingLeft: typeof paddingX === 'number' ? `${paddingX * 0.5}rem` : paddingX,
    paddingRight: typeof paddingX === 'number' ? `${paddingX * 0.5}rem` : paddingX,
    paddingTop: typeof paddingY === 'number' ? `${paddingY * 0.5}rem` : paddingY,
    paddingBottom: typeof paddingY === 'number' ? `${paddingY * 0.5}rem` : paddingY,
  }

  let borderClasses = ''
  if (borderStyle === 'round') {
    borderClasses = 'rounded-md border'
  }
  if (borderColor === 'subtle') {
    borderClasses += ' border-zinc-700/60 bg-zinc-900/80 shadow-xs'
  }

  return (
    <div style={styles} className={`${borderClasses} ${className}`} {...props}>
      {children}
    </div>
  )
}

export const ClaudeText: React.FC<any> = ({
  children,
  color = 'default',
  size = 'regular',
  weight = 'normal',
  tabular = false,
  className = '',
  ...props
}) => {
  let colorClass = 'text-zinc-200'
  if (color === 'subtle') colorClass = 'text-zinc-400'
  else if (color === 'inactive') colorClass = 'text-zinc-500'
  else if (color === 'success') colorClass = 'text-emerald-400'
  else if (color === 'warning') colorClass = 'text-amber-400'
  else if (color === 'error') colorClass = 'text-rose-400'
  else if (color === 'suggestion') colorClass = 'text-sky-400'

  let sizeClass = 'text-xs'
  if (size === 'footnote') sizeClass = 'text-[11px]'
  else if (size === 'large') sizeClass = 'text-sm'

  let weightClass = 'font-normal'
  if (weight === 'semibold') weightClass = 'font-semibold'
  else if (weight === 'bold') weightClass = 'font-bold'

  const fontFeatureClass = tabular ? 'font-mono' : ''

  return (
    <span className={`${colorClass} ${sizeClass} ${weightClass} ${fontFeatureClass} ${className}`} {...props}>
      {children}
    </span>
  )
}

export const ClaudeButton: React.FC<any> = ({ label, onPress, className = '', ...props }) => {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`ml-auto text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer ${className}`}
      {...props}
    >
      {label}
    </button>
  )
}
