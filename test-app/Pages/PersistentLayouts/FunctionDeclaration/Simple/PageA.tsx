import { Link, usePage } from '@adwd/inertia-preact'
import FnSiteLayout from '@/Layouts/FnSiteLayout'

const PageA = () => {
  window._inertia_page_props = usePage().props

  return (
    <div>
      <span class="text">Simple Persistent Layout - Page A</span>
      <Link href="/persistent-layouts/function-declaration/simple/page-b">Page B</Link>
    </div>
  )
}

PageA.layout = FnSiteLayout

export default PageA
