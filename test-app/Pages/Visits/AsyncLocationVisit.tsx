import { router } from '@adwd/inertia-preact'
import { useEffect, useRef, useState } from 'preact/hooks'

export default () => {
  const [draft, setDraft] = useState('')
  const [banner, setBanner] = useState('')
  const [lastVersionChange, setLastVersionChange] = useState('')
  const bannerMode = useRef(false)
  const [bannerModeLabel, setBannerModeLabel] = useState(false)

  useEffect(() => {
    return router.on('location', (event) => {
      setLastVersionChange(String(event.detail.versionChange))

      if (bannerMode.current && event.detail.versionChange) {
        event.preventDefault()
        setBanner('A new version is available')
      }
    })
  }, [])

  const backgroundReload = () => {
    router.reload({ headers: { 'X-Simulate-Version-Change': '1' } })
  }

  const backgroundManualLocation = () => {
    router.reload({ headers: { 'X-Simulate-Manual-Location': '1' } })
  }

  const toggleBannerMode = () => {
    bannerMode.current = !bannerMode.current
    setBannerModeLabel(bannerMode.current)
  }

  return (
    <div>
      <span class="text">This is the page that demonstrates async location visits</span>

      <input id="draft" value={draft} onInput={(e) => setDraft(e.currentTarget.value)} />

      <button onClick={backgroundReload} class="reload">
        Background reload
      </button>
      <button onClick={backgroundManualLocation} class="manual-location">
        Background manual location
      </button>
      <button onClick={toggleBannerMode} class="banner-mode">
        Banner mode: {String(bannerModeLabel)}
      </button>

      <span id="version-change">{lastVersionChange}</span>
      <span id="banner">{banner}</span>
    </div>
  )
}
