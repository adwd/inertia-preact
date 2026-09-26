import { Link } from '@adwd/inertia-preact'
import type { ComponentChildren } from 'preact'
import NestedLayout from '@/Layouts/NestedLayout.jsx'
import SiteLayout from '@/Layouts/SiteLayout.jsx'

const PageA = () => {
  return (
    <div>
      <span class="text">Nested Persistent Layout - Page A</span>
      <Link href="/persistent-layouts/render-function/nested/page-b">Page B</Link>
    </div>
  )
}

PageA.layout = (page: ComponentChildren) => {
  return (
    <SiteLayout>
      <NestedLayout children={page} />
    </SiteLayout>
  )
}

export default PageA
