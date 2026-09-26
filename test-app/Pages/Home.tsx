import { Head, Link, router } from 'inertia-preact'

export default (props: { example: string }) => {
  const visitsMethod = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/method')
  }

  const visitsReplace = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/visits/replace')
  }

  const redirect = (e: MouseEvent) => {
    e.preventDefault()
    router.post('/redirect')
  }

  const redirectExternal = (e: MouseEvent) => {
    e.preventDefault()
    router.post('/redirect-external')
  }

  const redirectHash = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/redirect-hash')
  }

  const redirectHashPost = (e: MouseEvent) => {
    e.preventDefault()
    router.post('/redirect-hash')
  }

  // window._inertia_page_key = getCurrentInstance().uid
  window._inertia_props = props
  // window._plugin_global_props = getCurrentInstance().appContext.config.globalProperties

  return (
    <>
      <Head title="Home" />

      <div>
        <span class="text">This is the Test App Entrypoint page</span>

        <Link href="/links/method" class="links-method">
          Basic Links
        </Link>

        <Link href="/links/replace" class="links-replace">
          'Replace' Links
        </Link>

        <Link href="/links/as-component" class="links-as-component">
          As Component
        </Link>

        <Link href="/links/as-element" class="links-as-component">
          As Element
        </Link>

        <a href="#" onClick={visitsMethod} class="visits-method">
          Manual basic visits
        </a>

        <a href="#" onClick={visitsReplace} class="visits-replace">
          Manual 'Replace' visits
        </a>

        <Link href="/redirect" method="post" class="links-redirect">
          Internal Redirect Link
        </Link>
        <a href="#" onClick={redirect} class="visits-redirect">
          Manual Redirect visit
        </a>

        <Link href="/redirect-external" method="post" class="links-redirect-external">
          External Redirect Link
        </Link>

        <a href="#" onClick={redirectExternal} class="visits-redirect-external">
          Manual External Redirect visit
        </a>

        <a href="#" onClick={redirectHash} class="visits-redirect-hash">
          Manual Hash Redirect visit
        </a>

        <a href="#" onClick={redirectHashPost} class="visits-redirect-hash-post">
          Manual Hash Redirect POST visit
        </a>

        <Link id="navigate-back" href="/head/mixed">
          Go to Mixed Head
        </Link>

        <Link href="/links/as-element" class="link-targets-self" target="_self">
          Target _self
        </Link>
        <Link href="/links/as-element" class="link-targets-blank" target="_blank">
          Target _blank
        </Link>
      </div>
    </>
  )
}
