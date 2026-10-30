interface Props {
  status: string | null
  explorerOpen: boolean
  onToggleExplorer: () => void
}

export default function TopBar({ status, explorerOpen, onToggleExplorer }: Props): JSX.Element {
  return (
    <header className="topbar">
      <button
        className={'ghost' + (explorerOpen ? ' active' : '')}
        aria-pressed={explorerOpen}
        title={explorerOpen ? 'Hide Explorer' : 'Show Explorer'}
        onClick={onToggleExplorer}
      >
        Explorer
      </button>
      <div className="topbar-title">MarkNote</div>
      <div className="topbar-status">{status}</div>
    </header>
  )
}
