/**
 * Firebase Migration Toolkit - AST Utilities
 * دوال تحليل ومعالجة AST
 */
const path = require("path");
const recast = require("recast");
const {
  SRC_DIR,
  INSTANCE_IMPORTS,
  NEW_FIREBASE_FILES,
  FIRESTORE_FUNCTIONS,
  AUTH_FUNCTIONS,
  STORAGE_FUNCTIONS,
  MESSAGING_FUNCTIONS,
} = require("./config.cjs");

const parser = require("recast/parsers/babel");

function parseSource(sourceCode) {
  try {
    return recast.parse(sourceCode, { parser });
  } catch (err) {
    throw new Error(`Parse error: ${err.message}`);
  }
}

function printAst(ast) {
  return recast.print(ast, {
    quote: "double",
    tabWidth: 2,
    lineTerminator: "\n",
  }).code;
}

function getRelativeImportPath(fromFile, toBaseName) {
  const fromDir = path.dirname(fromFile);
  const toFile = path.join(SRC_DIR, toBaseName + ".js");
  let rel = path.relative(fromDir, toFile).replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = "./" + rel;
  }
  return rel.replace(/\.js$/, "");
}

function classifyImportName(name, fromFile) {
  if (INSTANCE_IMPORTS[name]) {
    return {
      type: "instance",
      source: getRelativeImportPath(fromFile, INSTANCE_IMPORTS[name]),
    };
  }
  if (FIRESTORE_FUNCTIONS.has(name)) {
    return { type: "sdk", source: "firebase/firestore" };
  }
  if (AUTH_FUNCTIONS.has(name)) {
    return { type: "sdk", source: "firebase/auth" };
  }
  if (STORAGE_FUNCTIONS.has(name)) {
    return { type: "sdk", source: "firebase/storage" };
  }
  if (MESSAGING_FUNCTIONS.has(name)) {
    return { type: "sdk", source: "firebase/messaging" };
  }
  return { type: "unknown", source: null };
}

function isFirebaseLegacyImport(sourceValue) {
  if (!sourceValue || typeof sourceValue !== "string") {
    return false;
  }
  // Direct SDK imports like "firebase/firestore"
  if (sourceValue.startsWith("firebase/")) {
    return false;
  }
  // New local files like "../firebaseDb" or "./firebaseAuth"
  const base = path.basename(sourceValue).replace(/\.js$/, "");
  if (NEW_FIREBASE_FILES.has(base)) {
    return false;
  }
  // Any other path containing "firebase"
  return sourceValue.includes("firebase");
}

function createImportDeclaration(names, source) {
  const b = recast.types.builders;
  const specifiers = names.map((n) =>
    b.importSpecifier(b.identifier(n.imported), b.identifier(n.local))
  );
  return b.importDeclaration(specifiers, b.literal(source));
}

function getImportOrderPriority(source) {
  if (!source) return 99;
  if (source.startsWith("react") || source.startsWith("React")) return 1;
  if (!source.startsWith(".") && !source.startsWith("/")) {
    if (source.startsWith("firebase/")) return 30;
    return 20;
  }
  return 40;
}

function compareImportSources(a, b) {
  const pa = getImportOrderPriority(a);
  const pb = getImportOrderPriority(b);
  if (pa !== pb) return pa - pb;
  return a.localeCompare(b);
}

module.exports = {
  parseSource,
  printAst,
  classifyImportName,
  isFirebaseLegacyImport,
  createImportDeclaration,
  compareImportSources,
};
