import type { Method } from '@inertiajs/core'
import { Link } from 'inertia-preact'

export default ({ method }: { method: Method }) => {
  return (
    <div>
      <span class="text">This is the links page that demonstrates inertia-links without the 'as' warning</span>

      <Link method={method} href="/example" class="get" as="button">
        {method} button Link
      </Link>
    </div>
  )
}
