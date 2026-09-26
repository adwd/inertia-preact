import { router } from 'inertia-preact'

export default () => {
  const invalidVisit = () => {
    router.post('/non-inertia')
  }

  const invalidVisitJson = () => {
    router.post('/json')
  }

  const invalidVisitXss = () => {
    router.post('/non-inertia/xss')
  }

  return (
    <div>
      <span onClick={invalidVisit} class="invalid-visit">
        Invalid Visit
      </span>
      <span onClick={invalidVisitJson} class="invalid-visit-json">
        Invalid Visit (JSON response)
      </span>
      <span onClick={invalidVisitXss} class="invalid-visit-xss">
        Invalid Visit (XSS)
      </span>
    </div>
  )
}
