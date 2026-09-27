export default function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null
  }

  return (
    <ul class="tag-list">
      {tags.map((tag) => (
        <li key={tag} class="tag-default tag-pill tag-outline">
          {tag}
        </li>
      ))}
    </ul>
  )
}
