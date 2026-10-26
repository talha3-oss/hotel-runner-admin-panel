'use client'

import { useCallback, useEffect } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import { Mark, mergeAttributes } from '@tiptap/core'

// Tiptap is the editor here: MIT licensed, so nothing to pay for or register,
// and it is a React component rather than a jQuery plugin bolted onto a
// textarea. It writes plain HTML, which is what both the FAQ list and the page
// renderer now read.

/** Tiptap has no font size of its own — size normally comes from choosing a
 *  heading. This adds one as a span with an inline style, which is what the
 *  "Size" dropdown writes. */
const FontSize = Mark.create({
  name: 'fontSize',

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) =>
          attributes.size ? { style: `font-size: ${attributes.size}` } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[style*="font-size"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})

const SIZES = [
  { label: 'Normal', value: '' },
  { label: 'Small', value: '0.875em' },
  { label: 'Large', value: '1.25em' },
  { label: 'Larger', value: '1.5em' },
]

function ToolbarButton({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the selection while clicking
      onClick={onClick}
      className={`h-8 min-w-8 px-2 rounded text-sm font-medium transition-colors disabled:opacity-40 ${
        active ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200" />
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href || ''
    const url = window.prompt('Web address for this link:', previous)
    if (url === null) return // cancelled
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    // A bare domain typed into the box is still meant as a link, so it gets a
    // scheme rather than being treated as a path on this site.
    const href = /^(https?:|mailto:|tel:|\/|#)/i.test(url.trim())
      ? url.trim()
      : `https://${url.trim()}`
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }, [editor])

  const currentSize = editor.getAttributes('fontSize').size || ''

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
      <select
        title="Text size"
        value={currentSize}
        onChange={(e) => {
          const value = e.target.value
          const chain = editor.chain().focus()
          if (!value) chain.unsetMark('fontSize').run()
          else chain.setMark('fontSize', { size: value }).run()
        }}
        className="h-8 rounded border border-gray-200 bg-white px-1.5 text-xs text-gray-600 focus:outline-none"
      >
        {SIZES.map((s) => (
          <option key={s.label} value={s.value}>{s.label}</option>
        ))}
      </select>

      <Divider />

      <ToolbarButton title="Bold" active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Large heading" active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H1
      </ToolbarButton>
      <ToolbarButton title="Small heading" active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H2
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Bulleted list" active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        ⯇
      </ToolbarButton>
      <ToolbarButton title="Centre" active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        ≡
      </ToolbarButton>
      <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        ⯈
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Add or edit a link" active={editor.isActive('link')} onClick={setLink}>
        🔗 Link
      </ToolbarButton>
      <ToolbarButton title="Remove the link" disabled={!editor.isActive('link')}
        onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
        ⛓️‍💥
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        ✕ Format
      </ToolbarButton>
    </div>
  )
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 180,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const editor = useEditor({
    // Next renders this on the server first; letting Tiptap do the same warns
    // about a hydration mismatch, because the editor's DOM is built by
    // ProseMirror and cannot match.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: toInitialHtml(value),
    onUpdate: ({ editor }) => {
      // An editor emptied by hand reports "<p></p>", which is not nothing but
      // looks like it. Saving an empty string keeps "is this filled in?"
      // checks elsewhere working.
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none px-3 py-2.5 text-sm text-gray-800',
        style: `min-height:${minHeight}px`,
      },
    },
  })

  // The modal fills its fields after mounting, and an edit opens on a
  // different FAQ than the one before, so the editor has to be told when the
  // value it was given is replaced from outside. Comparing against its own
  // HTML first stops this fighting with what is being typed.
  useEffect(() => {
    if (!editor) return
    const incoming = toInitialHtml(value)
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) {
    return (
      <div
        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-400"
        style={{ minHeight: minHeight + 40 }}
      >
        Loading editor…
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {placeholder && editor.isEmpty && (
        <p className="px-3 pb-2 text-xs text-gray-400">{placeholder}</p>
      )}
    </div>
  )
}

/** Everything written before this editor existed is plain text with line
 *  breaks. Handing that to Tiptap as HTML would collapse it onto one line, so
 *  it is turned into paragraphs first. Anything that already looks like HTML
 *  is passed through untouched. */
function toInitialHtml(value: string) {
  const text = value || ''
  if (!text.trim()) return ''
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
