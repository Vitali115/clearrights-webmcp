export type TextScale = 'system' | 'large' | 'extra_large'
export type ColorSchemePreference = 'system' | 'light' | 'dark'
export type ContrastPreference = 'system' | 'higher'
export type MotionPreference = 'system' | 'reduced'
export type ReadingLayout = 'standard' | 'focused'

export interface AccessibilityState {
  textScale: TextScale
  colorScheme: ColorSchemePreference
  contrast: ContrastPreference
  motion: MotionPreference
  readingLayout: ReadingLayout
}

export type AccessibilityPrimitiveId = keyof AccessibilityState
export type AccessibilityPreferenceValue = AccessibilityState[AccessibilityPrimitiveId]
export type AccessibilityOrigin = 'human' | 'agent' | 'system'
export type AccessibilityVerificationScope = 'local_demo' | 'external'

export interface AccessibilityOptionDefinition {
  value: AccessibilityPreferenceValue
  label: string
  summary: string
}

export interface AccessibilityPrimitiveDefinition {
  id: AccessibilityPrimitiveId
  label: string
  summary: string
  details: string
  options: readonly AccessibilityOptionDefinition[]
}

export interface SystemAccessibilityPreferences {
  prefersReducedMotion: boolean
  prefersHigherContrast: boolean
  prefersDarkColorScheme: boolean
  forcedColorsActive: boolean
}

export interface AccessibilityChangeResult {
  before: AccessibilityState
  after: AccessibilityState
  readback: AccessibilityState
  changed: boolean
  origin: AccessibilityOrigin
  adapterId: string
  scope: AccessibilityVerificationScope
  undoAvailable: boolean
}

export class AccessibilityError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AccessibilityError'
    this.code = code
  }
}
