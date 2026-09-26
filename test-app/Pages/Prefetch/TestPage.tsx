import { Link } from 'inertia-preact'

export default () => {
  return (
    <div>
      <Link href="/prefetch/form" prefetch>
        Go to Prefetch Form
      </Link>
    </div>
  )
}
