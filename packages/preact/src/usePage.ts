import type { Page, PageProps, SharedPageProps } from '@inertiajs/core'
import { useContext } from 'preact/hooks'
import { PageContext } from './context'

/** Returns the current page. Re-renders the component on every visit. */
export default function usePage<TPageProps extends PageProps = PageProps>(): Page<TPageProps & SharedPageProps> {
  const page = useContext(PageContext)

  if (!page) {
    throw new Error('usePage() must be used within an Inertia app')
  }

  return page as Page<TPageProps & SharedPageProps>
}
