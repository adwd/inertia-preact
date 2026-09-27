import { Head, Link } from '@adwd/inertia-preact'

const messages: Record<number, string> = {
  404: "The page you're looking for doesn't exist.",
  500: 'Something went wrong on our side.',
}

export default function Error({ status }: { status: number }) {
  return (
    <div class="container page">
      <Head title={status === 404 ? 'Not found' : 'Error'} />

      <div class="row">
        <div class="col-md-6 offset-md-3 col-xs-12 text-xs-center">
          <h1>{status}</h1>
          <p>{messages[status] ?? 'An error occurred.'}</p>
          <Link href="/">Back to the home page</Link>
        </div>
      </div>
    </div>
  )
}
