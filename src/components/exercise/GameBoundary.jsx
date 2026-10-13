import { Component } from 'react'

import { useTranslation } from '@/lib/useTranslation'

// The game needs WebGL. On a browser or device that cannot create a context the
// 3D canvas throws, and without a boundary that takes the whole page down with
// "Application error". This keeps the failure inside the game's frame.
export class GameBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('[game] could not start:', error)
  }

  render() {
    return this.state.failed ? <GameUnavailable /> : this.props.children
  }
}

function GameUnavailable() {
  const { t } = useTranslation()

  return (
    <div className="flex h-96 items-center justify-center px-8 text-center sm:h-[28rem]">
      <p className="max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {t('exercise.game.unavailable')}
      </p>
    </div>
  )
}
