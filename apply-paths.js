import fs from 'fs';
import path from 'path';
import { PATHS } from './src/routes/paths.js'; // استورد الخريطة الخاصة بك

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      
      // هنا نضع منطق الاستبدال الذكي
      // سنقوم باستبدال أي رابط مكسور بالمسار الصحيح من الخريطة
      Object.entries(PATHS.APP.CASES).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const regex = new RegExp(`['"](/cases/[^'"\\s>]+)['"]`, 'g');
          content = content.replace(regex, `PATHS.APP.CASES.${key}`);
        }
      });
      
      fs.writeFileSync(fullPath, content, "utf8");
    }
  });
}
walk('./src');