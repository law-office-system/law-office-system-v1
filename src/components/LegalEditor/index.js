// Named exports
export { default as LegalEditor } from './LegalEditor';
export { default as Toolbar } from './Toolbar';
export { default as ShapeExtension } from './ShapeExtension';
export { exportToPDF, exportToDOCX } from './ExportUtils';
export { 
  FontSize, 
  PageBreak, 
  LineHeight, 
  ParagraphSpacing, 
  Indent 
} from './customExtensions';

// Default export (for backward compatibility)
export { default } from './LegalEditor';