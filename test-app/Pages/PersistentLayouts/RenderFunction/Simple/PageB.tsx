import { Link } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import SiteLayout from '@/Layouts/SiteLayout.jsx'

const PageB = () => {
  return (
    <div>
      <span class="text">Simple Persistent Layout - Page B</span>
      <Link href="/persistent-layouts/render-function/simple/page-a">Page A</Link>
    </div>
  )
}

PageB.layout = (page: ComponentChildren) => <SiteLayout children={page} />

export default PageB
