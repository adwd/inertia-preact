import { Form, Head } from '@adwd/inertia-preact'
import { useState } from 'preact/hooks'
import ErrorMessages from '../components/ErrorMessages.tsx'

interface Props {
  /** The article to edit, or null for a new one */
  article: { slug: string; title: string; description: string; body: string; tagList: string[] } | null
}

/** The tags as pills, submitted as `tagList[]` fields, and an input adding a tag on Enter */
function TagInput({ initialTags }: { initialTags: string[] }) {
  const [tags, setTags] = useState(initialTags)

  function addTag(input: HTMLInputElement) {
    const tag = input.value.trim()

    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }

    input.value = ''
  }

  return (
    <fieldset class="form-group">
      <input
        type="text"
        class="form-control"
        placeholder="Enter tags"
        onKeyDown={(event) => {
          // Enter adds the tag, rather than submitting the form
          if (event.key === 'Enter') {
            event.preventDefault()
            addTag(event.currentTarget)
          }
        }}
        onBlur={(event) => addTag(event.currentTarget)}
      />
      <div class="tag-list">
        {tags.map((tag) => (
          <span key={tag} class="tag-default tag-pill">
            <input type="hidden" name="tagList[]" value={tag} />
            <i
              class="ion-close-round"
              role="button"
              aria-label={`Remove ${tag}`}
              onClick={() => setTags(tags.filter((candidate) => candidate !== tag))}
            />{' '}
            {tag}
          </span>
        ))}
      </div>
    </fieldset>
  )
}

export default function Editor({ article }: Props) {
  return (
    <div class="editor-page">
      <Head title={article ? `Edit ${article.title}` : 'New Article'} />

      <div class="container page">
        <div class="row">
          <div class="col-md-10 offset-md-1 col-xs-12">
            <ErrorMessages />

            <Form
              action={article ? `/editor/${encodeURIComponent(article.slug)}` : '/editor'}
              method={article ? 'put' : 'post'}
              disableWhileProcessing
            >
              <fieldset class="form-group">
                <input
                  type="text"
                  class="form-control form-control-lg"
                  name="title"
                  placeholder="Article Title"
                  defaultValue={article?.title}
                />
              </fieldset>
              <fieldset class="form-group">
                <input
                  type="text"
                  class="form-control"
                  name="description"
                  placeholder="What's this article about?"
                  defaultValue={article?.description}
                />
              </fieldset>
              <fieldset class="form-group">
                <textarea
                  class="form-control"
                  rows={8}
                  name="body"
                  placeholder="Write your article (in markdown)"
                  defaultValue={article?.body}
                />
              </fieldset>
              <TagInput initialTags={article?.tagList ?? []} />
              <button class="btn btn-lg pull-xs-right btn-primary" type="submit">
                Publish Article
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
