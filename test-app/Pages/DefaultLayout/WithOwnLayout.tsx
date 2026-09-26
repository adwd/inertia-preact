import { Link } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import PageLayout from '@/Layouts/PageLayout'

const WithOwnLayout = () => {
  return (
    <div>
      <span id="text">DefaultLayout/WithOwnLayout</span>
      <Link href="/default-layout">Back to Index</Link>
    </div>
  )
}

WithOwnLayout.layout = (page: ComponentChildren) => <PageLayout children={page} />

export default WithOwnLayout
