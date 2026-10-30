import { useEffect, useRef } from 'react'

const REPO_URL = 'https://github.com/hongjianjin/MarkNote'

interface Props {
  onClose: () => void
}

export default function AboutDialog({ onClose }: Props): JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-title">About</h2>
        <dl className="about-list">
          <dt>Software</dt>
          <dd>MarkNote</dd>
          <dt>Version</dt>
          <dd>{__APP_VERSION__}</dd>
          <dt>GitHub</dt>
          <dd>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              {REPO_URL}
            </a>
          </dd>
        </dl>
        <div className="modal-actions">
          <button ref={closeRef} className="primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
