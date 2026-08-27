import {
  createDefaultAccessibilityState,
  type AccessibilityEnforcementAdapter,
  type AccessibilityState,
  type SystemAccessibilityPreferences,
} from '@clearrights/sdk/accessibility'

export class WaypointDomAccessibilityAdapter implements AccessibilityEnforcementAdapter {
  readonly id = 'waypoint-dom'
  readonly scope = 'local_demo' as const
  private lastOperation: { id: string; target: AccessibilityState } | null = null
  private readonly root: HTMLElement
  private readonly darkSchemeQuery: MediaQueryList | null

  constructor(root: HTMLElement, matchMedia?: Window['matchMedia']) {
    this.root = root
    this.darkSchemeQuery = matchMedia?.('(prefers-color-scheme: dark)') ?? null
    this.darkSchemeQuery?.addEventListener?.('change', this.syncResolvedColorScheme)
  }

  async readCurrentState(): Promise<AccessibilityState> {
    const defaults = createDefaultAccessibilityState()
    return {
      textScale: value(this.root.dataset.textScale, ['system', 'large', 'extra_large'], defaults.textScale),
      colorScheme: value(this.root.dataset.colorScheme, ['system', 'light', 'dark'], defaults.colorScheme),
      contrast: value(this.root.dataset.contrast, ['system', 'higher'], defaults.contrast),
      motion: value(this.root.dataset.motion, ['system', 'reduced'], defaults.motion),
      readingLayout: value(this.root.dataset.readingLayout, ['standard', 'focused'], defaults.readingLayout),
    }
  }

  async apply({ operationId, target }: { operationId: string; target: AccessibilityState }): Promise<void> {
    if (this.lastOperation?.id === operationId) {
      if (!sameState(this.lastOperation.target, target)) {
        throw new Error('An accessibility operation ID cannot be reused with a different target.')
      }
      return
    }
    this.root.dataset.textScale = target.textScale
    this.root.dataset.colorScheme = target.colorScheme
    this.root.dataset.contrast = target.contrast
    this.root.dataset.motion = target.motion
    this.root.dataset.readingLayout = target.readingLayout
    this.syncResolvedColorScheme()
    this.lastOperation = { id: operationId, target: { ...target } }
  }

  private readonly syncResolvedColorScheme = () => {
    const preference = value(this.root.dataset.colorScheme, ['system', 'light', 'dark'], 'system')
    const resolvedDark = preference === 'dark' || (preference === 'system' && this.darkSchemeQuery?.matches === true)
    this.root.classList.toggle('dark', resolvedDark)
    this.root.style.colorScheme = preference === 'system' ? 'light dark' : preference
  }
}

export function readSystemAccessibilityPreferences(windowObject: Pick<Window, 'matchMedia'>): SystemAccessibilityPreferences {
  return {
    prefersReducedMotion: windowObject.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersHigherContrast: windowObject.matchMedia('(prefers-contrast: more)').matches,
    prefersDarkColorScheme: windowObject.matchMedia('(prefers-color-scheme: dark)').matches,
    forcedColorsActive: windowObject.matchMedia('(forced-colors: active)').matches,
  }
}

function value<T extends string>(candidate: string | undefined, allowed: readonly T[], fallback: T): T {
  return candidate && allowed.includes(candidate as T) ? candidate as T : fallback
}

function sameState(left: AccessibilityState, right: AccessibilityState) {
  return left.textScale === right.textScale
    && left.colorScheme === right.colorScheme
    && left.contrast === right.contrast
    && left.motion === right.motion
    && left.readingLayout === right.readingLayout
}
