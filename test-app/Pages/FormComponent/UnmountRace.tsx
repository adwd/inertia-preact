import { Form } from '@adwd/inertia-preact'
import { useState } from 'preact/hooks'

export default function UnmountRace() {
  const [show, setShow] = useState(true)

  return (
    <div>
      <h1>Form Unmount Race</h1>

      {show && (
        <Form action="/dump/post" method="post">
          <input type="text" name="name" id="name" defaultValue="John" />
        </Form>
      )}

      <button id="hide" onClick={() => setShow(false)}>
        Hide Form
      </button>
    </div>
  )
}
