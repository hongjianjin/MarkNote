interface Props {
  status: string | null
}

export default function TopBar({ status }: Props): JSX.Element {
  return (
    <header className="topbar">
      <div className="topbar-title">MarkNote</div>
      <div className="topbar-status">{status}</div>
    </header>
  )
}
