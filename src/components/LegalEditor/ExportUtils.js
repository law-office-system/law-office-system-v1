import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak as DocxPageBreak, convertInchesToTwip, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

/* ═══════════════════════════════════════════════════════════════
   EXPORT TO PDF
   ═══════════════════════════════════════════════════════════════ */
export const exportToPDF = (element, filename = 'document') => {
  if (!element) {
    console.error('❌ لا يوجد عنصر للتصدير');
    return;
  }

  const opt = {
    margin: [0, 0, 0, 0],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      putOnlyUsedFonts: true,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  const clone = element.cloneNode(true);
  clone.style.boxShadow = 'none';
  clone.style.margin = '0';
  clone.style.padding = '20mm';
  clone.style.maxWidth = '210mm';
  clone.style.minHeight = '297mm';

  // Handle page breaks in PDF
  const pageBreaks = clone.querySelectorAll('.page-break-visual, [data-page-break]');
  pageBreaks.forEach(pb => {
    pb.style.pageBreakAfter = 'always';
    pb.style.height = '1px';
    pb.style.border = 'none';
    pb.innerHTML = '';
  });

  return html2pdf().set(opt).from(clone).save();
};

/* ═══════════════════════════════════════════════════════════════
   EXPORT TO DOCX (Word) — Enhanced with Font Size, Page Breaks & Tables
   ═══════════════════════════════════════════════════════════════ */
export const exportToDOCX = async (editorJSON, filename = 'document') => {
  if (!editorJSON) {
    console.error('❌ لا يوجد محتوى للتصدير');
    return;
  }

  const children = [];

  // Helper: Convert pt to half-points (DOCX uses half-points)
  const ptToHalfPoints = (pt) => Math.round(parseFloat(pt) * 2);

  // Helper: Get font size from marks
  const getFontSize = (marks) => {
    const fontSizeMark = marks?.find(m => m.type === 'textStyle' && m.attrs?.fontSize);
    return fontSizeMark ? ptToHalfPoints(fontSizeMark.attrs.fontSize) : 24; // Default 12pt
  };

  // Helper: Get font family
  const getFontFamily = (marks) => {
    const fontMark = marks?.find(m => m.type === 'textStyle' && m.attrs?.fontFamily);
    return fontMark ? fontMark.attrs.fontFamily.split(',')[0].trim() : 'Arial';
  };

  // Helper: Process text runs with marks
  const processTextRuns = (contentArray) => {
    const textRuns = [];
    if (!contentArray || !Array.isArray(contentArray)) return textRuns;

    contentArray.forEach((textNode) => {
      if (textNode.type === 'text') {
        const marks = textNode.marks || [];
        const fontSize = getFontSize(marks);
        const fontFamily = getFontFamily(marks);

        // Get color
        const colorMark = marks.find(m => m.type === 'textStyle' && m.attrs?.color);
        const color = colorMark ? colorMark.attrs.color.replace('#', '') : undefined;

        // Get highlight
        const highlightMark = marks.find(m => m.type === 'highlight');
        const highlight = highlightMark ? highlightMark.attrs.color?.replace('#', '') : undefined;

        textRuns.push(
          new TextRun({
            text: textNode.text,
            bold: marks.some((m) => m.type === 'bold'),
            italics: marks.some((m) => m.type === 'italic'),
            underline: marks.some((m) => m.type === 'underline') ? { type: 'single' } : undefined,
            strike: marks.some((m) => m.type === 'strike'),
            size: fontSize,
            font: { name: fontFamily },
            rightToLeft: true,
            color: color,
            highlight: highlight,
          })
        );
      }
    });
    return textRuns;
  };

  // Helper: Get alignment
  const getAlignment = (nodeAttrs) => {
    const alignMark = nodeAttrs?.textAlign;
    if (alignMark === 'center') return AlignmentType.CENTER;
    if (alignMark === 'left') return AlignmentType.LEFT;
    if (alignMark === 'justify') return AlignmentType.BOTH;
    return AlignmentType.RIGHT; // Default RTL
  };

  // Helper: Get spacing from paragraph attributes
  const getSpacing = (nodeAttrs) => {
    const lineHeight = nodeAttrs?.lineHeight ? parseFloat(nodeAttrs.lineHeight) * 240 : 480;
    const marginTop = nodeAttrs?.marginTop ? parseInt(nodeAttrs.marginTop) * 20 : 0;
    const marginBottom = nodeAttrs?.marginBottom ? parseInt(nodeAttrs.marginBottom) * 20 : 200;
    return { after: marginBottom, before: marginTop, line: lineHeight, lineRule: 'auto' };
  };

  const processNode = (node) => {
    if (!node) return;

    // ─── Page Break ───
    if (node.type === 'pageBreak') {
      children.push(new DocxPageBreak());
      return;
    }

    // ─── Paragraph ───
    if (node.type === 'paragraph') {
      const textRuns = processTextRuns(node.content);
      const indent = node.attrs?.indent ? parseInt(node.attrs.indent) * 720 : 0;

      children.push(
        new Paragraph({
          children: textRuns.length > 0 ? textRuns : [new TextRun({ text: '' })],
          alignment: getAlignment(node.attrs),
          spacing: getSpacing(node.attrs),
          bidirectional: true,
          indent: indent > 0 ? { right: indent } : undefined,
        })
      );
    }

    // ─── Heading ───
    else if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      const textRuns = processTextRuns(node.content);
      const headingSize = level === 1 ? 32 : level === 2 ? 28 : 24;

      // Override font size for headings if not explicitly set
      const sizedRuns = textRuns.map(run => {
        if (!run.properties?.size) {
          return new TextRun({ ...run.properties, size: headingSize });
        }
        return run;
      });

      children.push(
        new Paragraph({
          children: sizedRuns.length > 0 ? sizedRuns : [new TextRun({ text: '' })],
          alignment: getAlignment(node.attrs),
          spacing: getSpacing(node.attrs),
          bidirectional: true,
          heading: level,
        })
      );
    }

    // ─── Lists ───
    else if (node.type === 'bulletList' || node.type === 'orderedList') {
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((item) => {
          if (item.type === 'listItem' && item.content) {
            item.content.forEach((p) => processNode(p));
          }
        });
      }
    }

    // ─── Table ─── FIXED: Proper table export
    else if (node.type === 'table') {
      const tableRows = [];

      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((row) => {
          if (row.type === 'tableRow' && row.content) {
            const tableCells = [];

            row.content.forEach((cell) => {
              if (cell.type === 'tableCell' || cell.type === 'tableHeader') {
                const cellParagraphs = [];

                if (cell.content && Array.isArray(cell.content)) {
                  cell.content.forEach((cellNode) => {
                    if (cellNode.type === 'paragraph') {
                      const textRuns = processTextRuns(cellNode.content);
                      cellParagraphs.push(
                        new Paragraph({
                          children: textRuns.length > 0 ? textRuns : [new TextRun({ text: '' })],
                          alignment: getAlignment(cellNode.attrs),
                          bidirectional: true,
                        })
                      );
                    }
                  });
                }

                tableCells.push(
                  new DocxTableCell({
                    children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ text: '' })],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                    },
                    width: { size: 100 / row.content.length, type: WidthType.PERCENTAGE },
                  })
                );
              }
            });

            tableRows.push(new DocxTableRow({ children: tableCells }));
          }
        });
      }

      if (tableRows.length > 0) {
        children.push(
          new DocxTable({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            bidirectional: true,
          })
        );
      }
    }

    // ─── Blockquote ───
    else if (node.type === 'blockquote') {
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child) => processNode(child));
      }
    }
  };

  if (editorJSON?.content && Array.isArray(editorJSON.content)) {
    editorJSON.content.forEach((node) => processNode(node));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          rtl: true,
          page: {
            margin: { 
              top: convertInchesToTwip(1), 
              right: convertInchesToTwip(1), 
              bottom: convertInchesToTwip(1), 
              left: convertInchesToTwip(1) 
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};