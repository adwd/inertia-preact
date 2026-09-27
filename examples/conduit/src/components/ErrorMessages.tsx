import { usePage } from '@adwd/inertia-preact'

/** The validation errors the server sent back with the page, after a form submission */
export default function ErrorMessages() {
  const messages = Object.values(usePage().props.errors)

  if (messages.length === 0) {
    return null
  }

  return (
    <ul class="error-messages">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}
