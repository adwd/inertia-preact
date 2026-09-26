import { router } from '@adwd/inertia-preact'

interface Contact {
  id: number
  name: string
  is_favorite: boolean
}

export default ({ contacts, errors }: { contacts: Contact[]; errors?: Record<string, string> }) => {
  const toggleFavorite = (
    contact: Contact,
    { delay = 500, error = false, hold = 0 }: { delay?: number; error?: boolean; hold?: number } = {},
  ) => {
    router
      .optimistic<{ contacts: Contact[] }>((props) => ({
        contacts: props.contacts.map((c) => (c.id === contact.id ? { ...c, is_favorite: !c.is_favorite } : c)),
      }))
      .post(
        `/optimistic/rollback/toggle/${contact.id}?delay=${delay}&error=${error ? '1' : '0'}&hold=${hold}`,
        {},
        { preserveScroll: true },
      )
  }

  const reset = () => {
    router.post('/optimistic/rollback/reset')
  }

  return (
    <div>
      <h1>Optimistic Rollback</h1>

      <div id="contact-list">
        {contacts.map((contact) => (
          <div key={contact.id} class="contact-item">
            <span class="contact-name">{contact.name}</span>
            <span class="contact-status">{contact.is_favorite ? 'Favorite' : 'Not Favorite'}</span>
            <button class="toggle-btn" onClick={() => toggleFavorite(contact)}>
              Toggle
            </button>
            <button class="toggle-error-btn" onClick={() => toggleFavorite(contact, { error: true })}>
              Toggle (Error)
            </button>
            <button class="toggle-slow-btn" onClick={() => toggleFavorite(contact, { delay: 1000 })}>
              Toggle (Slow)
            </button>
            <button class="toggle-slow-error-btn" onClick={() => toggleFavorite(contact, { delay: 1000, error: true })}>
              Toggle (Slow Error)
            </button>
            <button class="toggle-held-btn" onClick={() => toggleFavorite(contact, { hold: 1000 })}>
              Toggle (Held)
            </button>
          </div>
        ))}
      </div>

      {errors?.toggle && <div id="error-message">{errors.toggle}</div>}

      <button id="reset-btn" onClick={reset}>
        Reset
      </button>
    </div>
  )
}
