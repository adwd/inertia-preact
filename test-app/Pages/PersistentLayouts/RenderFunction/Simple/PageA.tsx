import { Link } from '@adwd/inertia-preact'
import type { ComponentChildren } from 'preact'
import SiteLayout from '@/Layouts/SiteLayout'

const PageA = () => {
  return (
    <div>
      <span class="text">Simple Persistent Layout - Page A</span>
      <Link href="/persistent-layouts/render-function/simple/page-b">Page B</Link>
    </div>
  )
}

PageA.layout = (page: ComponentChildren) => <SiteLayout children={page} />

export default PageA
