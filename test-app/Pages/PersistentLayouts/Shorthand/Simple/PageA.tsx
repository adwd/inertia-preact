import { Link, usePage } from '@adwd/inertia-preact'
import type { ComponentChildren } from 'preact'
import SiteLayout from '@/Layouts/SiteLayout'

const PageA = () => {
  window._inertia_page_props = usePage().props

  return (
    <div>
      <span class="text">Simple Persistent Layout - Page A</span>
      <Link href="/persistent-layouts/shorthand/simple/page-b">Page B</Link>
    </div>
  )
}

PageA.layout = (page: ComponentChildren) => <SiteLayout children={page} />

export default PageA
