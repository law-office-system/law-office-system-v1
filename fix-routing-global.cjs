const fs = require("fs");
const path = require("path");

const ROOT = "./src";

// إصلاحات آمنة بدون تكرار /app/app
const rules = [
  // Links
  { from: /to="\/case\//g, to: 'to="/app/case/' },
  { from: /to="\/cases/g, to: 'to="/app/cases' },

  { from: /to="\/chat/g, to: 'to="/app/chat' },
  { from: /to="\/finance/g, to: 'to="/app/finance' },
  { from: /to="\/clients/g, to: 'to="/app/clients' },
  { from: /to="\/users/g, to: 'to="/app/users' },

  // navigate
  { from: /navigate\("\/case\//g, to: 'navigate("/app/case/' },
  { from: /navigate\("\/cases/g, to: 'navigate("/app/cases' },

  { from: /navigate\("\/chat/g, to: 'navigate("/app/chat' },
  { from: /navigate\("\/finance/g, to: 'navigate("/app/finance' },
  { from: /navigate\("\/clients/g, to: 'navigate("/app/clients' },

  // href
  { from: /href="\/case\//g, to: 'href="/app/case/' },
  { from: /href="\/chat/g, to: 'href="/app/chat' },
  { from: /href="\/finance/g, to: 'href="/app/finance' },
  { from: /href="\/clients/g, to: 'href="/app/clients' },
];

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);

    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      let content = fs.readFileSync(full, "utf8");
      let original = content;

      rules.forEach(r => {
        content = content.replace(r.from, r.to);
      });

      if (content !== original) {
        fs.writeFileSync(full, content, "utf8");
        console.log("✔ Fixed:", full);
      }
    }
  });
}

walk(ROOT);

console.log("✅ Global routing fix completed");