import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isChunkLoadError, reloadForNewVersion } from '../lib/chunkReload'
import { captureException } from '../lib/monitoring'

type ErrorBoundaryProps = {
  children: ReactNode
  where: string
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

type ErrorBoundaryState = { error: Error | null }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadForNewVersion()) return
    captureException(error, { where: this.props.where, componentStack: info.componentStack })
  }

  handleAction = () => {
    if (this.props.onAction) {
      this.setState({ error: null })
      this.props.onAction()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const {
      title = 'Coś poszło nie tak',
      description = 'Aplikacja napotkała nieoczekiwany błąd. Twoje zapisane trasy i jazdy są bezpieczne.',
      actionLabel = 'Odśwież aplikację',
    } = this.props
    return (
      <div
        role="alert"
        className="fixed inset-0 z-[5000] flex items-center justify-center bg-vanilla p-6 text-center"
      >
        <div className="max-w-sm space-y-3">
          <h1 className="text-xl font-semibold text-[#FC6C26]">{title}</h1>
          <p className="text-sm text-stone-600">{description}</p>
          <button
            type="button"
            onClick={this.handleAction}
            className="soft-button rounded-xl border border-[#E08A50] bg-white px-4 py-2 text-sm font-semibold text-[#E05518]"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
