import { Marked, type Tokens } from 'marked'

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Relative URLs, and absolute ones with these protocols only (no `javascript:` links)
const isSafeUrl = (url: string) => {
  const protocol = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim())?.[1]?.toLowerCase()
  return protocol === undefined || ['http', 'https', 'mailto'].includes(protocol)
}

const marked = new Marked({
  gfm: true,
  renderer: {
    // Raw HTML in the Markdown is shown as text, never interpreted
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text)
    },
    link({ href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens)

      if (!isSafeUrl(href)) {
        return text
      }

      const titleAttribute = title ? ` title="${escapeHtml(title)}"` : ''
      return `<a href="${escapeHtml(href)}"${titleAttribute} rel="nofollow noopener">${text}</a>`
    },
    image({ href, title, text }: Tokens.Image) {
      if (!isSafeUrl(href)) {
        return escapeHtml(text)
      }

      const titleAttribute = title ? ` title="${escapeHtml(title)}"` : ''
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttribute}>`
    },
  },
})

/** Renders Markdown to HTML that is safe to insert in the page */
export function renderMarkdown(markdown: string) {
  return marked.parse(markdown, { async: false })
}
