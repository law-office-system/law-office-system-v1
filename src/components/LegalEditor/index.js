// Named exports — بس اللي مش بيحتوي على مكتبات ثقيلة
export { default as LegalEditor } from './LegalEditor';
export { default as ShapeExtension } from './ShapeExtension';
export { 
  FontSize, 
  PageBreak, 
  LineHeight, 
  ParagraphSpacing, 
  Indent 
} from './customExtensions';

// Default export (for backward compatibility)
export { default } from './LegalEditor';

// ⚠️ ملاحظة: Toolbar و ExportUtils مش متاحين هنا عشان نمنع static import
// لو محتاجهم، استوردهم مباشرة من الملف:
//   import Toolbar from './components/LegalEditor/Toolbar';
//   import { exportToPDF, exportToDOCX } from './components/LegalEditor/ExportUtils';