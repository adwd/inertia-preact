import { Link, usePage } from 'inertia-preact'
import FnSiteLayout from '@/Layouts/FnSiteLayout'

const PageB = () => {
  window._inertia_page_props = usePage().props

  return (
    <div>
      <span class="text">Simple Persistent Layout - Page B</span>
      <Link href="/persistent-layouts/function-declaration/simple/page-a">Page A</Link>
    </div>
  )
}

PageB.layout = FnSiteLayout

export default PageB
