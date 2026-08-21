import { Extension, Node } from '@tiptap/core'

// ═══════════════════════════════════════════════════════════════
// 1️⃣ Font Size Extension — FIXED: preserve original units
// ═══════════════════════════════════════════════════════════════
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => {
              const size = element.style.fontSize
              if (!size) return null
              // Keep the original value with unit if present
              return size
            },
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              const size = String(attributes.fontSize)
              const hasUnit = /(pt|px|em|rem|%)$/.test(size)
              return { style: `font-size: ${hasUnit ? size : size + 'pt'}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      },
    }
  },
})

// ═══════════════════════════════════════════════════════════════
// 2️⃣ Page Break Extension
// ═══════════════════════════════════════════════════════════════
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: false,

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }]
  },

  renderHTML() {
    return ['div', { 
      'data-page-break': 'true',
      style: 'height:80px;background:repeating-linear-gradient(0deg,transparent,transparent 8px,#fee2e2 8px,#fee2e2 16px);margin:20px 0;display:flex;align-items:center;justify-content:center;'
    }, ['span', { style: 'font-size:14px;font-weight:800;color:#dc2626;background:#fff;padding:4px 16px;border-radius:8px;border:2px solid #dc2626;' }, '◆ ◆ ◆  فاصل صفحة  ◆ ◆ ◆']]
  },

  addCommands() {
    return {
      insertPageBreak: () => ({ commands }) => {
        return commands.insertContent({ type: this.name })
      },
    }
  },
})

// ═══════════════════════════════════════════════════════════════
// 3️⃣ Line Height Extension — FIXED: apply to active node type
// ═══════════════════════════════════════════════════════════════
export const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return { types: ['paragraph', 'heading'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) return {}
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight: value => ({ chain, state }) => {
        // FIXED: detect the actual node type at cursor position
        const { $from } = state.selection
        const nodeType = $from.parent.type.name
        const targetType = this.options.types.includes(nodeType) ? nodeType : this.options.types[0]
        return chain().updateAttributes(targetType, { lineHeight: value }).run()
      },
    }
  },
})

// ═══════════════════════════════════════════════════════════════
// 4️⃣ Paragraph Spacing Extension — FIXED: apply to active node type
// ═══════════════════════════════════════════════════════════════
export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',
  addOptions() {
    return { types: ['paragraph', 'heading'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginTop: {
            default: null,
            parseHTML: element => element.style.marginTop?.replace('px', '') || null,
            renderHTML: attributes => {
              if (!attributes.marginTop) return {}
              return { style: `margin-top: ${attributes.marginTop}px` }
            },
          },
          marginBottom: {
            default: null,
            parseHTML: element => element.style.marginBottom?.replace('px', '') || null,
            renderHTML: attributes => {
              if (!attributes.marginBottom) return {}
              return { style: `margin-bottom: ${attributes.marginBottom}px` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setParagraphSpacing: ({ top, bottom }) => ({ chain, state }) => {
        // FIXED: detect the actual node type at cursor position
        const { $from } = state.selection
        const nodeType = $from.parent.type.name
        const targetType = this.options.types.includes(nodeType) ? nodeType : this.options.types[0]
        const updates = {}
        if (top !== undefined) updates.marginTop = top
        if (bottom !== undefined) updates.marginBottom = bottom
        return chain().updateAttributes(targetType, updates).run()
      },
    }
  },
})

// ═══════════════════════════════════════════════════════════════
// 5️⃣ Indent Extension (RTL) — FIXED: use tr.setNodeMarkup directly
// ═══════════════════════════════════════════════════════════════
export const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return { types: ['paragraph', 'heading', 'listItem'], indentSize: 40 }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const mr = parseInt(element.style.marginRight) || 0
              return Math.round(mr / this.options.indentSize)
            },
            renderHTML: attributes => {
              if (!attributes.indent) return {}
              return { style: `margin-right: ${attributes.indent * this.options.indentSize}px` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      increaseIndent: () => ({ tr, state, dispatch }) => {
        const { from, to } = state.selection
        let modified = false
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const current = node.attrs.indent || 0
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current + 1 })
            modified = true
          }
        })
        if (modified && dispatch) dispatch(tr)
        return modified
      },
      decreaseIndent: () => ({ tr, state, dispatch }) => {
        const { from, to } = state.selection
        let modified = false
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const current = node.attrs.indent || 0
            if (current > 0) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current - 1 })
              modified = true
            }
          }
        })
        if (modified && dispatch) dispatch(tr)
        return modified
      },
    }
  },
})