import { Form } from '@adwd/inertia-preact'
import { useMemo, useState } from 'preact/hooks'

const ChildElement = ({ name }: { name: string }) => {
  const [internalState, setInternalState] = useState('')
  const transformedState = useMemo(() => internalState.toUpperCase(), [internalState])

  return (
    <div>
      <label for={name}>Child Input</label>
      <input id={name} name={name} value={transformedState} onInput={(e) => setInternalState(e.currentTarget.value)} />
    </div>
  )
}

export default () => {
  return (
    <Form action="/dump/post" method="post">
      {({ isDirty }) => (
        <>
          <h1>Form Elements</h1>

          <div>
            Form is <span>{isDirty ? 'dirty' : 'clean'}</span>
          </div>

          <ChildElement name="child" />

          <button type="submit">Submit</button>
        </>
      )}
    </Form>
  )
}
