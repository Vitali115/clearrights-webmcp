import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { bootstrapBrowserApp } from '@/adapters/browser/bootstrap'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App'
import './index.css'

async function start() {
  const runtime = await bootstrapBrowserApp()
  const root = createRoot(document.getElementById('root')!)
  root.render(
    <StrictMode>
      <TooltipProvider>
        <App
          controller={runtime.controller}
          privacyUi={runtime.privacyUi}
          webMcpAvailable={runtime.webMcpAvailable}
        />
      </TooltipProvider>
    </StrictMode>,
  )
  window.addEventListener('pagehide', runtime.dispose, { once: true })
}

void start()
