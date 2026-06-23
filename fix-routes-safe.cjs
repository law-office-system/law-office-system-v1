const fs = require("fs");
const path = require("path");

const TARGET_DIR = "./src";

// إصلاحات آمنة فقط (بدون تكرار /app/app)
const rules = [
  // navigation & links فقط
  {
    from: /navigate\("\/case\//g,
    to: 'navigate("/app/case/'
  },
  {
    from: /to="\/case\//g,
    to: 'to="/app/case/'
  },

  {
    from: /navigate\("\/chat/g,
    to: 'navigate("/app/chat'
  },
  {
    from: /to="\/chat/g,
    to: 'to="/app/chat'
  },

  {
    from: /navigate\("\/finance/g,
    to: 'navigate("/app/finance'
  },
  {
    from: /to="\/finance/g,
    to: 'to="/app/finance'
  },

  {
    from: /navigate\("\/clients/g,
    to: 'navigate("/app/clients'
  },
  {
    from: /to="\/clients/g,
    to: 'to="/app/clients'
  }
];

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let original = content;

      rules.forEach(rule => {
        content = content.replace(rule.from, rule.to);
      });

      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log("✔ Fixed:", fullPath);
      }
    }
  });
}

walk(TARGET_DIR);

console.log("✅ Safe route fix completed");