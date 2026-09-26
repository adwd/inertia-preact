import { Link, usePage } from '@adwd/inertia-preact'
import type { ComponentChildren } from 'preact'
import SiteLayout from '@/Layouts/SiteLayout.jsx'

const PageB = () => {
  window._inertia_page_props = usePage().props

  return (
    <div>
      <span class="text">Simple Persistent Layout - Page B</span>
      <Link href="/persistent-layouts/shorthand/simple/page-a">Page A</Link>
    </div>
  )
}

PageB.layout = (page: ComponentChildren) => <SiteLayout children={page} />

export default PageB
