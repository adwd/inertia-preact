import { Link, usePage } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import NestedLayout from '@/Layouts/NestedLayout.jsx'
import SiteLayout from '@/Layouts/SiteLayout.jsx'

const PageB = () => {
  window._inertia_page_props = usePage().props

  return (
    <div>
      <span class="text">Nested Persistent Layout - Page B</span>
      <Link href="/persistent-layouts/shorthand/nested/page-a">Page A</Link>
    </div>
  )
}

PageB.layout = (page: ComponentChildren) => {
  return (
    <SiteLayout>
      <NestedLayout children={page} />
    </SiteLayout>
  )
}

export default PageB
