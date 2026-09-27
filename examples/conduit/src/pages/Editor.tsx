import { Head, useForm } from '@adwd/inertia-preact'
import { useState } from 'preact/hooks'
import ErrorMessages from '../components/ErrorMessages.tsx'

interface Props {
  /** The article to edit, or null for a new one */
  article: { slug: string; title: string; description: string; body: string; tagList: string[] } | null
}

export default function Editor({ article }: Props) {
  const form = useForm({
    title: article?.title ?? '',
    description: article?.description ?? '',
    body: article?.body ?? '',
    tagList: article?.tagList ?? [],
  })
  const [tag, setTag] = useState('')

  const addTag = () => {
    const name = tag.trim()

    if (name && !form.data.tagList.includes(name)) {
      form.setData('tagList', [...form.data.tagList, name])
    }

    setTag('')
  }

  const removeTag = (name: string) =>
    form.setData(
      'tagList',
      form.data.tagList.filter((candidate) => candidate !== name),
    )

  const submit = (event: SubmitEvent) => {
    event.preventDefault()

    if (article) {
      form.put(`/editor/${encodeURIComponent(article.slug)}`)
    } else {
      form.post('/editor')
    }
  }

  return (
    <div class="editor-page">
      <Head title={article ? `Edit ${article.title}` : 'New Article'} />

      <div class="container page">
        <div class="row">
          <div class="col-md-10 offset-md-1 col-xs-12">
            <ErrorMessages errors={form.errors} />

            <form onSubmit={submit}>
              <fieldset disabled={form.processing}>
                <fieldset class="form-group">
                  <input
                    type="text"
                    class="form-control form-control-lg"
                    name="title"
                    placeholder="Article Title"
                    value={form.data.title}
                    onInput={(event) => form.setData('title', event.currentTarget.value)}
                  />
                </fieldset>
                <fieldset class="form-group">
                  <input
                    type="text"
                    class="form-control"
                    name="description"
                    placeholder="What's this article about?"
                    value={form.data.description}
                    onInput={(event) => form.setData('description', event.currentTarget.value)}
                  />
                </fieldset>
                <fieldset class="form-group">
                  <textarea
                    class="form-control"
                    rows={8}
                    name="body"
                    placeholder="Write your article (in markdown)"
                    value={form.data.body}
                    onInput={(event) => form.setData('body', event.currentTarget.value)}
                  />
                </fieldset>
                <fieldset class="form-group">
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Enter tags"
                    value={tag}
                    onInput={(event) => setTag(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      // Enter adds the tag instead of submitting the form
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addTag()
                      }
                    }}
                    onBlur={addTag}
                  />
                  <div class="tag-list">
                    {form.data.tagList.map((name) => (
                      <span key={name} class="tag-default tag-pill">
                        <i
                          class="ion-close-round"
                          role="button"
                          aria-label={`Remove ${name}`}
                          onClick={() => removeTag(name)}
                        />{' '}
                        {name}
                      </span>
                    ))}
                  </div>
                </fieldset>
                <button class="btn btn-lg pull-xs-right btn-primary" type="submit">
                  Publish Article
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
