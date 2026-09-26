import type { HeadManager, Page } from '@inertiajs/core'
import { createContext } from 'preact'

/** The current page. Changes on every visit. */
export const PageContext = createContext<Page | null>(null)
PageContext.displayName = 'InertiaPage'

export interface AppState {
  headManager: HeadManager
  /**
   * False only while the app renders on top of server-rendered markup for the first time (hydration).
   * A mutable flag rather than state, since flipping it must not re-render anything.
   */
  hydrated: boolean
}

/** App-wide values that never change after the app is created. */
export const AppContext = createContext<AppState | null>(null)
AppContext.displayName = 'InertiaApp'
