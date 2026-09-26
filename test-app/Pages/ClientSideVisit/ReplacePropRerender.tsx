import { router } from '@adwd/inertia-preact'
import { Component } from 'preact'

type MemoChildProps = { prefix: string; item: { label: string } }

// Only re-renders when its props change, to tell whether replaceProp() kept the identity of untouched props
class MemoChild extends Component<MemoChildProps> {
  private renderCount = 0

  override shouldComponentUpdate(nextProps: MemoChildProps) {
    return nextProps.prefix !== this.props.prefix || nextProps.item !== this.props.item
  }

  override render() {
    this.renderCount++

    return (
      <div>
        <div id={`${this.props.prefix}-render-count`}>Render count: {this.renderCount}</div>
        <div id={`${this.props.prefix}-value`}>Value: {this.props.item.label}</div>
      </div>
    )
  }
}

export default ({
  user,
  other,
  profile,
}: {
  user: { name: string }
  other: { label: string }
  profile: { name: string; avatar: { label: string } }
}) => {
  return (
    <div>
      <h1>replaceProp Identity Test</h1>
      <div id="current-value">Current value: {user.name}</div>
      <div id="profile-name">Profile name: {profile.name}</div>

      <MemoChild prefix="memo" item={other} />
      <MemoChild prefix="avatar" item={profile.avatar} />

      <button onClick={() => router.replaceProp('user.name', 'Jane Smith')}>Replace user.name</button>
      <button onClick={() => router.replaceProp('profile.name', 'Jane Smith')}>Replace profile.name</button>
    </div>
  )
}
