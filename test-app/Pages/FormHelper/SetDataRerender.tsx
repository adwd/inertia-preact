import { InertiaForm, useForm } from '@adwd/inertia-preact'
import { Component } from 'preact'
import { useRef } from 'preact/hooks'

// Only re-renders when the form object changes, which it does on every form state change
class MemoizedDisplay extends Component<{ form: InertiaForm<{ position: string }> }> {
  override shouldComponentUpdate(nextProps: { form: InertiaForm<{ position: string }> }) {
    return nextProps.form !== this.props.form
  }

  override render() {
    return <div id="memo-value">Memo value: {this.props.form.data.position}</div>
  }
}

export default () => {
  const form = useForm({ position: 'initial' })
  const renderCount = useRef(0)

  renderCount.current++

  const options = ['initial', 'goalkeeper', 'defender', 'midfielder', 'forward']

  return (
    <div>
      <h1>setData Re-render Test</h1>
      <div id="render-count">Render count: {renderCount.current}</div>
      <div id="current-value">Current value: {form.data.position}</div>

      <MemoizedDisplay form={form} />

      {options.map((option) => (
        <button key={option} onClick={() => form.setData('position', option)}>
          Set {option}
        </button>
      ))}
    </div>
  )
}
