import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

const SHAPE_CONFIG = {
  line: {
    tag: 'line',
    attrs: (c) => ({ x1: '0', y1: '50%', x2: '100%', y2: '50%', stroke: c, 'stroke-width': '3' }),
    defaultWidth: 300,
    defaultHeight: 60,
    hasText: false,
  },
  circle: {
    tag: 'circle',
    attrs: (c) => ({ cx: '50%', cy: '50%', r: '45%', fill: 'none', stroke: c, 'stroke-width': '2' }),
    defaultWidth: 140,
    defaultHeight: 140,
    hasText: true,
  },
  square: {
    tag: 'rect',
    attrs: (c) => ({ x: '5%', y: '5%', width: '90%', height: '90%', fill: 'none', stroke: c, 'stroke-width': '2' }),
    defaultWidth: 140,
    defaultHeight: 140,
    hasText: true,
  },
  rectangle: {
    tag: 'rect',
    attrs: (c) => ({ x: '5%', y: '15%', width: '90%', height: '70%', fill: 'none', stroke: c, 'stroke-width': '2' }),
    defaultWidth: 260,
    defaultHeight: 120,
    hasText: true,
  },
  triangle: {
    tag: 'polygon',
    attrs: (c) => ({ points: '50%,8% 92%,92% 8%,92%', fill: 'none', stroke: c, 'stroke-width': '2' }),
    defaultWidth: 160,
    defaultHeight: 130,
    hasText: true,
  },
};

export default Node.create({
  name: 'shape',
  group: 'block',
  content: 'inline*',
  draggable: false,
  selectable: true,
  atom: false,

  addAttributes() {
    return {
      type: { default: 'rectangle' },
      color: { default: '#2563eb' },
      width: { default: 260 },
      height: { default: 120 },
      x: { default: 0 },
      y: { default: 0 },
      rotation: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-shape]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { type, color, width, height, x, y, rotation } = HTMLAttributes;
    const cfg = SHAPE_CONFIG[type] || SHAPE_CONFIG.rectangle;
    const shapeAttrs = cfg.attrs(color);
    const wrapperStyle = `width:${width}px;height:${height}px;position:relative;display:inline-block;vertical-align:top;transform:translate(${x || 0}px,${y || 0}px) rotate(${rotation || 0}deg);margin:8px 0;`;
    const svgAttrs = {
      width: '100%', height: '100%', viewBox: `0 0 ${width} ${height}`,
      xmlns: 'http://www.w3.org/2000/svg', style: 'display:block;position:absolute;inset:0;pointer-events:all;',
    };
    if (!cfg.hasText) {
      return ['div', { 'data-shape': type, class: 'editor-shape-wrapper', style: wrapperStyle }, ['svg', svgAttrs, [cfg.tag, shapeAttrs]]];
    }
    return ['div', { 'data-shape': type, class: 'editor-shape-wrapper', style: wrapperStyle }, ['svg', svgAttrs, [cfg.tag, shapeAttrs]], ['div', { class: 'shape-text-content', style: 'pointer-events:none;' }, 0]];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const { type, color, width, height, x = 0, y = 0, rotation = 0 } = node.attrs;
      const cfg = SHAPE_CONFIG[type] || SHAPE_CONFIG.rectangle;

      const state = {
        x: x, y: y, rotation: rotation, width: width, height: height,
        isDragging: false, isResizing: false, isRotating: false,
      };

      let isEditing = false;
      let saveTimer = null;

      const dom = document.createElement('div');
      dom.className = 'editor-shape-wrapper';
      dom.setAttribute('data-shape', type);
      dom.dataset.shapeId = Math.random().toString(36).substr(2, 9);
      applyTransform();

      function applyTransform() {
        dom.style.cssText = `width:${state.width}px;height:${state.height}px;position:relative;display:inline-block;vertical-align:top;transform:translate(${state.x}px,${state.y}px) rotate(${state.rotation}deg);margin:8px 0;`;
      }

      // SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.style.cssText = 'display:block;position:absolute;inset:0;pointer-events:all;';

      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', '0');
      bgRect.setAttribute('y', '0');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', 'transparent');
      svg.appendChild(bgRect);

      const shape = document.createElementNS('http://www.w3.org/2000/svg', cfg.tag);
      const attrs = cfg.attrs(color);
      Object.entries(attrs).forEach(([k, v]) => shape.setAttribute(k, v));
      svg.appendChild(shape);
      dom.appendChild(svg);

      // Resize Handles
      const corners = [
        { cls: 'nw', cursor: 'nw-resize' },
        { cls: 'ne', cursor: 'ne-resize' },
        { cls: 'sw', cursor: 'sw-resize' },
        { cls: 'se', cursor: 'se-resize' },
      ];

      corners.forEach((pos) => {
        const handle = document.createElement('div');
        handle.className = `shape-resize-handle ${pos.cls}`;
        handle.dataset.handle = 'true';
        handle.style.cssText = `cursor:${pos.cursor};position:absolute;width:14px;height:14px;background:#fff;border:2.5px solid #2563eb;border-radius:50%;z-index:999;`;
        if (pos.cls === 'nw') { handle.style.top = '-7px'; handle.style.left = '-7px'; }
        if (pos.cls === 'ne') { handle.style.top = '-7px'; handle.style.right = '-7px'; }
        if (pos.cls === 'sw') { handle.style.bottom = '-7px'; handle.style.left = '-7px'; }
        if (pos.cls === 'se') { handle.style.bottom = '-7px'; handle.style.right = '-7px'; }
        dom.appendChild(handle);
      });

      // Rotation handle
      const rotHandle = document.createElement('div');
      rotHandle.className = 'shape-rotate-handle';
      rotHandle.title = 'اسحب لتدوير';
      rotHandle.style.cssText = `position:absolute;top:-28px;left:50%;transform:translateX(-50%);width:20px;height:20px;background:#fff;border:2.5px solid #dc2626;border-radius:50%;z-index:999;cursor:grab;display:flex;align-items:center;justify-content:center;font-size:10px;color:#dc2626;user-select:none;`;
      rotHandle.innerHTML = '↻';

      const rotLine = document.createElement('div');
      rotLine.className = 'shape-rotate-line';
      rotLine.style.cssText = `position:absolute;top:-8px;left:50%;width:2px;height:14px;background:#dc2626;transform:translateX(-50%);z-index:998;`;
      dom.appendChild(rotLine);
      dom.appendChild(rotHandle);

      // Content DOM
      let contentDOM = null;
      if (cfg.hasText) {
        contentDOM = document.createElement('div');
        contentDOM.className = 'shape-text-content';
        contentDOM.style.pointerEvents = 'none';
        dom.appendChild(contentDOM);
      }

      const enterEditMode = () => {
        if (!contentDOM || isEditing) return;
        isEditing = true;
        dom.classList.add('shape-editing');
        contentDOM.style.pointerEvents = 'all';
        setTimeout(() => contentDOM.focus(), 10);
      };

      const exitEditMode = () => {
        if (!contentDOM || !isEditing) return;
        isEditing = false;
        dom.classList.remove('shape-editing');
        contentDOM.style.pointerEvents = 'none';
        contentDOM.blur();
      };

      const saveToProseMirror = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          const p = getPos();
          if (typeof p !== 'number') return;
          try {
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(p, undefined, {
                ...node.attrs,
                x: state.x,
                y: state.y,
                rotation: state.rotation,
                width: state.width,
                height: state.height,
              })
            );
          } catch (err) {
            console.warn('save failed:', err);
          }
        }, 150);
      };

      const onDocumentClick = (e) => {
        if (!dom.contains(e.target)) exitEditMode();
      };
      document.addEventListener('mousedown', onDocumentClick);
      document.addEventListener('touchstart', onDocumentClick, { passive: true });

      const onKeyDown = (e) => {
        if (e.key === 'Escape' && isEditing) {
          e.preventDefault();
          exitEditMode();
          editor.view.focus();
        }
      };
      document.addEventListener('keydown', onKeyDown);

      // ═══════════════════════════════════════════════════════════════
      // MOUSE handlers (desktop) — unchanged
      // ═══════════════════════════════════════════════════════════════
      const onMouseDown = (e) => {
        const target = e.target;
        const isHandle = target.closest('.shape-resize-handle');
        const isRot = target.closest('.shape-rotate-handle');
        const isRotLine = target.classList?.contains('shape-rotate-line');
        const isText = contentDOM && contentDOM.contains(target);

        if (isText && isEditing) return;

        e.preventDefault();
        e.stopPropagation();

        const pos = getPos();
        if (typeof pos === 'number') {
          editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
        }

        const startPos = { x: e.clientX, y: e.clientY };

        if (isHandle) {
          exitEditMode();
          state.isResizing = true;
          const dir = isHandle.classList.contains('nw') ? 'nw' :
                      isHandle.classList.contains('ne') ? 'ne' :
                      isHandle.classList.contains('sw') ? 'sw' : 'se';
          const startW = state.width;
          const startH = state.height;

          const onMouseMove = (ev) => {
            ev.preventDefault();
            const dx = ev.clientX - startPos.x;
            const dy = ev.clientY - startPos.y;
            let newW = startW, newH = startH;
            if (dir.includes('e')) newW = Math.max(60, startW + dx);
            if (dir.includes('w')) newW = Math.max(60, startW - dx);
            if (dir.includes('s')) newH = Math.max(40, startH + dy);
            if (dir.includes('n')) newH = Math.max(40, startH - dy);
            state.width = newW;
            state.height = newH;
            dom.style.width = `${newW}px`;
            dom.style.height = `${newH}px`;
            svg.setAttribute('viewBox', `0 0 ${newW} ${newH}`);
          };

          const onMouseUp = () => {
            state.isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveToProseMirror();
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          return;
        }

        if (isRot || isRotLine) {
          exitEditMode();
          state.isRotating = true;
          const rect = dom.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const onMouseMove = (ev) => {
            ev.preventDefault();
            const dx = ev.clientX - centerX;
            const dy = ev.clientY - centerY;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
            state.rotation = Math.round(angle);
            applyTransform();
          };

          const onMouseUp = () => {
            state.isRotating = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveToProseMirror();
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          return;
        }

        const startOffsetX = state.x;
        const startOffsetY = state.y;
        const clickThreshold = 5;
        let hasMoved = false;

        dom.style.cursor = 'move';

        const onMouseMove = (ev) => {
          ev.preventDefault();
          const dx = ev.clientX - startPos.x;
          const dy = ev.clientY - startPos.y;

          if (!hasMoved && (Math.abs(dx) > clickThreshold || Math.abs(dy) > clickThreshold)) {
            hasMoved = true;
            state.isDragging = true;
            exitEditMode();
          }

          if (state.isDragging) {
            state.x = startOffsetX + dx;
            state.y = startOffsetY + dy;
            applyTransform();
          }
        };

        const onMouseUp = () => {
          state.isDragging = false;
          dom.style.cursor = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          if (!hasMoved && isText && contentDOM) {
            enterEditMode();
          } else {
            saveToProseMirror();
          }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      // ═══════════════════════════════════════════════════════════════
      // TOUCH handlers (mobile) — prevents scroll during drag/resize/rotate
      // Key: touchmove with { passive: false } + preventDefault()
      // ═══════════════════════════════════════════════════════════════
      const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;

        const target = e.target;
        const isHandle = target.closest('.shape-resize-handle');
        const isRot = target.closest('.shape-rotate-handle');
        const isRotLine = target.classList?.contains('shape-rotate-line');
        const isText = contentDOM && contentDOM.contains(target);

        if (isText && isEditing) return;

        e.stopPropagation();

        const pos = getPos();
        if (typeof pos === 'number') {
          editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
        }

        const touch = e.touches[0];
        const startPos = { x: touch.clientX, y: touch.clientY };

        // ═══ Touch Resize ═══
        if (isHandle) {
          exitEditMode();
          state.isResizing = true;
          const dir = isHandle.classList.contains('nw') ? 'nw' :
                      isHandle.classList.contains('ne') ? 'ne' :
                      isHandle.classList.contains('sw') ? 'sw' : 'se';
          const startW = state.width;
          const startH = state.height;

          const onTouchMove = (ev) => {
            if (ev.touches.length !== 1) return;
            ev.preventDefault(); // ✅ Prevent page scroll
            const t = ev.touches[0];
            const dx = t.clientX - startPos.x;
            const dy = t.clientY - startPos.y;
            let newW = startW, newH = startH;
            if (dir.includes('e')) newW = Math.max(60, startW + dx);
            if (dir.includes('w')) newW = Math.max(60, startW - dx);
            if (dir.includes('s')) newH = Math.max(40, startH + dy);
            if (dir.includes('n')) newH = Math.max(40, startH - dy);
            state.width = newW;
            state.height = newH;
            dom.style.width = `${newW}px`;
            dom.style.height = `${newH}px`;
            svg.setAttribute('viewBox', `0 0 ${newW} ${newH}`);
          };

          const onTouchEnd = () => {
            state.isResizing = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
            saveToProseMirror();
          };

          document.addEventListener('touchmove', onTouchMove, { passive: false });
          document.addEventListener('touchend', onTouchEnd);
          document.addEventListener('touchcancel', onTouchEnd);
          return;
        }

        // ═══ Touch Rotate ═══
        if (isRot || isRotLine) {
          exitEditMode();
          state.isRotating = true;
          const rect = dom.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const onTouchMove = (ev) => {
            if (ev.touches.length !== 1) return;
            ev.preventDefault(); // ✅ Prevent page scroll
            const t = ev.touches[0];
            const dx = t.clientX - centerX;
            const dy = t.clientY - centerY;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
            state.rotation = Math.round(angle);
            applyTransform();
          };

          const onTouchEnd = () => {
            state.isRotating = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
            saveToProseMirror();
          };

          document.addEventListener('touchmove', onTouchMove, { passive: false });
          document.addEventListener('touchend', onTouchEnd);
          document.addEventListener('touchcancel', onTouchEnd);
          return;
        }

        // ═══ Touch Drag ═══
        const startOffsetX = state.x;
        const startOffsetY = state.y;
        const clickThreshold = 8;
        let hasMoved = false;

        const onTouchMove = (ev) => {
          if (ev.touches.length !== 1) return;
          const t = ev.touches[0];
          const dx = t.clientX - startPos.x;
          const dy = t.clientY - startPos.y;

          if (!hasMoved && (Math.abs(dx) > clickThreshold || Math.abs(dy) > clickThreshold)) {
            hasMoved = true;
            state.isDragging = true;
            exitEditMode();
          }

          if (state.isDragging) {
            ev.preventDefault(); // ✅ Prevent page scroll only when dragging
            state.x = startOffsetX + dx;
            state.y = startOffsetY + dy;
            applyTransform();
          }
        };

        const onTouchEnd = () => {
          state.isDragging = false;
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('touchend', onTouchEnd);
          document.removeEventListener('touchcancel', onTouchEnd);

          if (!hasMoved && isText && contentDOM) {
            enterEditMode();
          } else if (hasMoved) {
            saveToProseMirror();
          }
        };

        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
      };

      dom.addEventListener('mousedown', onMouseDown, true);
      dom.addEventListener('touchstart', onTouchStart, { passive: true });

      // Double-click / Double-tap
      if (contentDOM) {
        let lastTap = 0;
        dom.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode();
        });
        dom.addEventListener('touchend', (e) => {
          const now = Date.now();
          if (now - lastTap < 300) {
            e.preventDefault();
            e.stopPropagation();
            enterEditMode();
          }
          lastTap = now;
        }, { passive: false });
      }

      return {
        dom,
        contentDOM,

        stopEvent(event) {
          if (event.target?.closest?.('.shape-resize-handle')) return true;
          if (event.target?.closest?.('.shape-rotate-handle')) return true;
          if (event.target?.classList?.contains('shape-rotate-line')) return true;
          if (state.isDragging) return true;
          if (state.isResizing) return true;
          if (state.isRotating) return true;
          if (isEditing && contentDOM && contentDOM.contains(event.target)) {
            return false;
          }
          return false;
        },

        ignoreMutation(record) {
          const target = record.target;
          if (!target) return false;
          if (target === dom && record.attributeName === 'style') return true;
          if (target.closest?.('svg')) return true;
          if (target.closest?.('.shape-resize-handle')) return true;
          if (target.closest?.('.shape-rotate-handle')) return true;
          if (target.closest?.('.shape-rotate-line')) return true;
          return false;
        },

        selectNode() {
          dom.classList.add('ProseMirror-selectednode');
        },

        deselectNode() {
          dom.classList.remove('ProseMirror-selectednode');
          exitEditMode();
        },

        update: (updatedNode) => {
          if (updatedNode.type.name !== 'shape') return false;
          const { width: nw, height: nh, color: nc, x: nx, y: ny, rotation: nr } = updatedNode.attrs;

          if (nc !== color) {
            const shapeEl = svg.querySelector(cfg.tag);
            if (shapeEl) {
              const newAttrs = cfg.attrs(nc);
              Object.entries(newAttrs).forEach(([k, v]) => shapeEl.setAttribute(k, v));
            }
          }

          if (!state.isDragging && !state.isResizing && !state.isRotating) {
            const newX = nx || 0;
            const newY = ny || 0;
            const newRot = nr || 0;
            const newW = nw || width;
            const newH = nh || height;

            if (newX !== state.x || newY !== state.y || newRot !== state.rotation ||
                newW !== state.width || newH !== state.height) {
              state.x = newX;
              state.y = newY;
              state.rotation = newRot;
              state.width = newW;
              state.height = newH;
              applyTransform();
            }
          }

          return true;
        },

        destroy: () => {
          if (saveTimer) clearTimeout(saveTimer);
          dom.removeEventListener('mousedown', onMouseDown, true);
          dom.removeEventListener('touchstart', onTouchStart);
          document.removeEventListener('mousedown', onDocumentClick);
          document.removeEventListener('touchstart', onDocumentClick);
          document.removeEventListener('keydown', onKeyDown);
        },
      };
    };
  },

  addCommands() {
    return {
      insertShape: (type) => ({ chain }) => {
        const cfg = SHAPE_CONFIG[type] || SHAPE_CONFIG.rectangle;
        return chain().focus().insertContent({
          type: 'shape',
          attrs: { type, width: cfg.defaultWidth, height: cfg.defaultHeight, color: '#2563eb', x: 0, y: 0, rotation: 0 },
          content: cfg.hasText ? [{ type: 'text', text: ' ' }] : [],
        }).run();
      },
    };
  },
});