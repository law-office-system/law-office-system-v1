const fs = require("fs");
const path = require("path");

const TARGET_DIR = "./src";

// قائمة المسارات التي تحتاج تحويل
const routesToFix = ["case", "cases", "chat", "finance", "clients", "users", "edit", "add-session", "add-stage"];

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let original = content;

      routesToFix.forEach(route => {
        // هذا الـ Regex يبحث عن أي رابط يبدأ بـ /route ولا يسبقه /app/
        const regex = new RegExp(`(['"])/${route}(/[^'"\\s>]*|['"])`, 'g');
        content = content.replace(regex, `$1/app/${route}$2`);
      });

      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf8"); // الحفظ الإجباري
        console.log("✅ تم تعديل وحفظ الملف:", fullPath);
      }
    }
  });
}

console.log("🚀 جاري البدء في التعديل الشامل...");
walk(TARGET_DIR);
console.log("🏁 انتهت العملية بنجاح.");