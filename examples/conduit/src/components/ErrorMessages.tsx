/** The validation errors sent back by the server */
export default function ErrorMessages({ errors }: { errors: Record<string, string | undefined> }) {
  const messages = Object.values(errors).filter((message) => message !== undefined)

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
