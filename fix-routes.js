import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = "./src";

const routesToFix = ["case", "cases", "chat", "finance", "clients", "users", "edit", "add-session", "add-stage"];

function walk(dir) {
  const absoluteDir = path.resolve(__dirname, dir);
  fs.readdirSync(absoluteDir).forEach(file => {
    const fullPath = path.join(absoluteDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(path.join(dir, file));
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let original = content;

      routesToFix.forEach(route => {
        const regex = new RegExp(`(['"])/${route}(/[^'"\\s>]*|['"])`, 'g');
        content = content.replace(regex, `$1/app/${route}$2`);
      });

      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log("✅ تم تعديل وحفظ الملف:", fullPath);
      }
    }
  });
}

console.log("🚀 جاري البدء في التعديل الشامل...");
walk(TARGET_DIR);
console.log("🏁 انتهت العملية بنجاح.");