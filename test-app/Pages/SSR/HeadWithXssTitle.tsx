import { Head } from '@adwd/inertia-preact'

export default ({ title }: { title: string }) => {
  return (
    <>
      <Head title={title} />
      <div>
        <p>Head title escaping test</p>
      </div>
    </>
  )
}
