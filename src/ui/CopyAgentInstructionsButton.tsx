import { useState } from 'react'
import { Button } from '@/components/ui/button'

export const AGENT_PRIVACY_PROMPT = `Inspect the privacy settings exposed by this site. Explain which optional data uses are active and the consequence of changing each one. Prepare the least-data plan that keeps the capabilities I need. Do not apply anything until I have reviewed and confirmed the exact plan in the page.`

interface CopyAgentInstructionsButtonProps {
  className?: string
  onError?(message: string): void
}

export function CopyAgentInstructionsButton({
  className,
  onError,
}: CopyAgentInstructionsButtonProps) {
  const [copied, setCopied] = useState(false)

  const copyPrompt = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.')
      await navigator.clipboard.writeText(AGENT_PRIVACY_PROMPT)
      setCopied(true)
    } catch (cause) {
      onError?.(cause instanceof Error ? cause.message : 'The agent instructions could not be copied.')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => void copyPrompt()}
    >
      {copied ? 'Instructions copied' : 'Copy agent instructions'}
    </Button>
  )
}
