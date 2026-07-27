#!/usr/bin/env node
/**
 * Firebase Migration Toolkit - AST Migration
 *
 * Usage:
 *   node scripts/migrate-firebase-imports-ast.cjs           # Run migration
 *   node scripts/migrate-firebase-imports-ast.cjs --dry-run # Preview only
 *   node scripts/migrate-firebase-imports-ast.cjs --rollback # Restore backups
 */
const fs = require("fs");
const path = require("path");
const recast = require("recast");
const {
  SRC_DIR,
  FIREBASE_FILES_TO_IGNORE,
  FILE_EXTENSIONS,
} = require("./config.cjs");
const {
  parseSource,
  printAst,
  classifyImportName,
  isFirebaseLegacyImport,
  createImportDeclaration,
  compareImportSources,
} = require("./ast-utils.cjs");
const { success, warn, error, info, divider, report } = require("./logger.cjs");

const DRY_RUN = process.argv.includes("--dry-run");
const ROLLBACK = process.argv.includes("--rollback");

const stats = {
  scanned: 0,
  modified: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now(),
};

/* ─── Helpers ─── */

function shouldIgnoreFile(filePath) {
  const basename = path.basename(filePath);
  const rel = path.relative(SRC_DIR, filePath).replace(/\\/g, "/");
  if (FIREBASE_FILES_TO_IGNORE.has(basename)) return true;
  if (FIREBASE_FILES_TO_IGNORE.has(rel)) return true;
  return false;
}

function hasValidExtension(filePath) {
  return FILE_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

function getAllSourceFiles(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllSourceFiles(fullPath, files);
    } else if (entry.isFile() && hasValidExtension(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function createBackup(filePath) {
  const backupPath = filePath + ".bak";
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }
}

function restoreBackup(filePath) {
  const backupPath = filePath + ".bak";
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, filePath);
    return true;
  }
  return false;
}

function removeBackup(filePath) {
  const backupPath = filePath + ".bak";
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
}

/* ─── Core Logic ─── */

function processFile(filePath) {
  stats.scanned++;

  if (shouldIgnoreFile(filePath)) {
    stats.skipped++;
    return;
  }

  const sourceCode = fs.readFileSync(filePath, "utf8");
  let ast;
  try {
    ast = parseSource(sourceCode);
  } catch (err) {
    stats.errors++;
    error(
      `Parse failed: ${path.relative(process.cwd(), filePath)} - ${err.message}`
    );
    return;
  }

  const body = ast.program.body;
  const imports = [];
  const others = [];

  for (const node of body) {
    if (node.type === "ImportDeclaration") imports.push(node);
    else others.push(node);
  }

  let changed = false;
  const newImportsMap = new Map(); // source -> [{imported, local}]
  const importsToKeep = [];

  for (const imp of imports) {
    const source = imp.source.value;

    if (!isFirebaseLegacyImport(source)) {
      importsToKeep.push(imp);
      continue;
    }

    const knownNames = [];
    const unknownNames = [];

    for (const spec of imp.specifiers) {
      if (spec.type === "ImportSpecifier") {
        const importedName = spec.imported.name;
        const localName = spec.local.name;
        const classification = classifyImportName(importedName, filePath);

        if (classification.type === "unknown") {
          unknownNames.push({ imported: importedName, local: localName });
        } else {
          knownNames.push({
            imported: importedName,
            local: localName,
            source: classification.source,
          });
        }
      } else if (
        spec.type === "ImportDefaultSpecifier" ||
        spec.type === "ImportNamespaceSpecifier"
      ) {
        unknownNames.push({
          imported: "default",
          local: spec.local.name,
          isDefault: true,
        });
      }
    }

    // Group known names by their new source
    for (const n of knownNames) {
      if (!newImportsMap.has(n.source)) newImportsMap.set(n.source, []);
      const list = newImportsMap.get(n.source);
      if (!list.find((x) => x.imported === n.imported)) {
        list.push({ imported: n.imported, local: n.local });
      }
    }

    if (unknownNames.length > 0) {
      const b = recast.types.builders;
      const newSpecifiers = unknownNames.map((n) => {
        if (n.isDefault) {
          return b.importDefaultSpecifier(b.identifier(n.local));
        }
        return b.importSpecifier(
          b.identifier(n.imported),
          b.identifier(n.local)
        );
      });
      importsToKeep.push(b.importDeclaration(newSpecifiers, imp.source));
      if (knownNames.length > 0) changed = true;
    } else {
      if (knownNames.length > 0) {
        changed = true;
      } else {
        importsToKeep.push(imp);
      }
    }
  }

  if (!changed) return;

  // Merge new imports with existing ones
  for (const [source, names] of newImportsMap) {
    const existing = importsToKeep.find((imp) => imp.source.value === source);
    if (existing) {
      for (const n of names) {
        const alreadyThere = existing.specifiers.some(
          (s) => s.type === "ImportSpecifier" && s.imported.name === n.imported
        );
        if (!alreadyThere) {
          const b = recast.types.builders;
          existing.specifiers.push(
            b.importSpecifier(b.identifier(n.imported), b.identifier(n.local))
          );
        }
      }
    } else {
      importsToKeep.push(createImportDeclaration(names, source));
    }
  }

  // Remove empty imports
  const finalImports = importsToKeep.filter((imp) => imp.specifiers.length > 0);

  // Sort: React → Third-Party → Firebase → Local
  finalImports.sort((a, b) =>
    compareImportSources(a.source.value, b.source.value)
  );

  ast.program.body = [...finalImports, ...others];

  const newCode = printAst(ast);

  if (DRY_RUN) {
    info(`Would modify: ${path.relative(process.cwd(), filePath)}`);
    stats.modified++;
    return;
  }

  createBackup(filePath);
  fs.writeFileSync(filePath, newCode, "utf8");
  success(path.relative(process.cwd(), filePath));
  stats.modified++;
}

/* ─── Main ─── */

function run() {
  info("🔥 Firebase Migration Toolkit - AST Mode");
  divider();

  if (!fs.existsSync(SRC_DIR)) {
    error(`Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  if (DRY_RUN) info("🏃 Dry Run mode - no files will be modified");
  if (ROLLBACK) info("↩️  Rollback mode - restoring from .bak files");

  const files = getAllSourceFiles(SRC_DIR);
  info(`Found ${files.length} source files`);

  for (const file of files) {
    try {
      if (ROLLBACK) {
        if (restoreBackup(file)) {
          success(`Restored: ${path.relative(process.cwd(), file)}`);
          stats.modified++;
        }
        removeBackup(file);
      } else {
        processFile(file);
      }
    } catch (err) {
      stats.errors++;
      error(`Failed: ${path.relative(process.cwd(), file)} - ${err.message}`);
    }
  }

  if (!ROLLBACK && !DRY_RUN) {
    divider();
    info("Cleaning up backup files...");
    for (const file of files) {
      if (!shouldIgnoreFile(file)) removeBackup(file);
    }
  }

  divider();
  info("📊 Migration Report");
  divider();
  report("Files scanned", stats.scanned);
  report("Files modified", stats.modified);
  report("Files skipped", stats.skipped);
  report("Errors", stats.errors);
  report(
    "Execution time",
    `${((Date.now() - stats.startTime) / 1000).toFixed(2)}s`
  );
  divider();

  if (stats.errors > 0) {
    process.exit(1);
  }
}

run();
