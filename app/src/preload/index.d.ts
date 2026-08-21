import type { OneNoteBridge } from '../shared/types'

declare global {
  interface Window {
    oneNote: OneNoteBridge
  }
}

export {}
