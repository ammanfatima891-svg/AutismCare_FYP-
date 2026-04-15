/**
 * Gold + Blue UI codemod — aligns Tailwind classnames with the design system in `src/styles/globals.css`:
 * primary #1E3A8A, lighter blue actions #3B82F6, accent gold #D4AF37, surfaces via bg-background / bg-card / muted.
 *
 * Run from repo root: `node client/scripts/apply-semantic-ui.mjs`
 * Or: `cd client && npm run apply-ui-tokens`
 *
 * Maps: gray/slate/zinc/stone → semantic; purple/pink/rose/fuchsia/violet → blue/yellow/gold;
 * sky/indigo/cyan/teal/emerald → blue; orange/lime/amber → yellow; decorative red/green → destructive / blue;
 * fixes invalid utilities (e.g. amber-* absent from bundle → yellow-*).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

const EXT = new Set([".tsx", ".ts", ".jsx", ".js"]);
const SKIP_DIR = new Set(["__tests__", "node_modules", "dist"]);

/** @type {Array<[RegExp, string]>} */
const REPLACEMENTS = [
  // Longer / specific first
  [/bg-gradient-to-br from-purple-50 via-white to-pink-50/g, "bg-gradient-to-br from-blue-50 via-background to-yellow-50"],
  [/bg-gradient-to-r from-purple-50 to-pink-50/g, "bg-gradient-to-r from-blue-50 to-yellow-50"],
  [/from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700/g, "from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"],
  [/from-purple-600 to-pink-600/g, "from-blue-600 to-blue-500"],
  [/hover:from-purple-700 hover:to-pink-700/g, "hover:from-blue-700 hover:to-blue-600"],
  [/from-purple-100 to-pink-100/g, "from-blue-100 to-yellow-100"],
  [/hover:border-pink-400/g, "hover:border-primary"],
  [/from-white to-pink-50\/30/g, "from-card to-yellow-50/30"],
  [/from-purple-50 to-indigo-50/g, "from-blue-50 to-yellow-50"],
  [/from-purple-100 hover:to-indigo-100/g, "from-blue-100 hover:to-yellow-100"],
  [/hover:from-purple-100 hover:to-indigo-100/g, "hover:from-blue-100 hover:to-yellow-100"],
  [/border-purple-100/g, "border"],
  [/from-purple-500 to-violet-600/g, "from-blue-600 to-blue-500"],

  [/bg-slate-50\/80/g, "bg-muted/80"],
  [/bg-slate-50/g, "bg-background"],
  [/bg-slate-100/g, "bg-muted"],
  [/text-slate-500/g, "text-muted-foreground"],
  [/text-slate-600/g, "text-muted-foreground"],
  [/text-slate-700/g, "text-foreground"],
  [/text-slate-800/g, "text-foreground"],
  [/text-slate-900/g, "text-foreground"],
  [/border-slate-200/g, "border"],
  [/border-slate-100/g, "border"],

  [/hover:bg-gray-100/g, "hover:bg-muted"],
  [/hover:bg-gray-50/g, "hover:bg-muted"],
  [/bg-gray-100/g, "bg-muted"],
  [/bg-gray-50/g, "bg-muted"],
  [/text-gray-400/g, "text-muted-foreground"],
  [/text-gray-500/g, "text-muted-foreground"],
  [/text-gray-600/g, "text-muted-foreground"],
  [/text-gray-700/g, "text-foreground"],
  [/text-gray-800/g, "text-foreground"],
  [/text-gray-900/g, "text-foreground"],
  [/border-gray-300/g, "border"],
  [/border-gray-200/g, "border"],
  [/border-gray-100/g, "border"],

  [/dark:bg-gray-900/g, "dark:bg-background"],
  [/dark:bg-gray-800/g, "dark:bg-card"],
  [/dark:bg-gray-950/g, "dark:bg-background"],
  [/dark:text-gray-100/g, "dark:text-foreground"],
  [/dark:text-gray-300/g, "dark:text-muted-foreground"],
  [/dark:border-gray-700/g, "dark:border"],
  [/dark:border-gray-600/g, "dark:border"],

  [/bg-white\/90/g, "bg-card"],
  [/bg-white\/50/g, "bg-muted"],
  [/bg-white\b/g, "bg-card"],

  [/hover:bg-slate-100/g, "hover:bg-muted"],
  [/hover:bg-slate-50/g, "hover:bg-muted"],

  // Pink / purple → Gold + Blue family
  [/from-pink-50 to-purple-50/g, "from-yellow-50 to-blue-50"],
  [/group-hover:from-pink-100 group-hover:to-purple-100/g, "group-hover:from-yellow-100 group-hover:to-blue-100"],
  [/from-pink-400 to-purple-400/g, "from-accent to-blue-500"],
  [/from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700/g, "from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"],
  [/from-pink-600 to-purple-600/g, "from-blue-600 to-blue-500"],
  [/from-blue-400 to-purple-500/g, "from-blue-500 to-blue-700"],
  [/to-purple-50/g, "to-blue-50"],
  [/text-pink-600/g, "text-primary"],
  [/text-pink-700/g, "text-primary"],
  [/hover:text-pink-700/g, "hover:text-primary"],
  [/hover:bg-pink-100/g, "hover:bg-muted"],
  [/border-pink-200/g, "border"],
  [/border-pink-300/g, "border"],
  [/hover:border-pink-300/g, "hover:border-primary"],
  [/text-purple-400/g, "text-muted-foreground"],
  [/text-purple-500/g, "text-primary"],
  [/text-purple-600/g, "text-primary"],
  [/text-purple-700/g, "text-primary"],
  [/text-purple-800/g, "text-foreground"],
  [/bg-purple-50/g, "bg-muted"],
  [/bg-purple-100/g, "bg-muted"],
  [/border-purple-200/g, "border"],
  [/border-purple-300/g, "border"],
  [/hover:border-purple-500/g, "hover:border-primary"],
  [/hover:border-purple-200/g, "hover:border-primary"],
  [/hover:bg-purple-50/g, "hover:bg-muted"],
  [/bg-purple-600/g, "bg-primary"],
  [/hover:bg-purple-700/g, "hover:bg-blue-800"],
  [/data-\[state=active\]:bg-purple-600/g, "data-[state=active]:bg-primary"],
  [/border-l-purple-400/g, "border-l-primary"],
  [/border-purple-600/g, "border-primary"],
  [/focus:ring-purple-300/g, "focus-visible:ring-ring/50"],
  [/border-2 border-purple-200/g, "border-2 border"],
  [/border-2 border-pink-200/g, "border-2 border"],
  [/border-b border-pink-200/g, "border-b border"],

  // Rose (soft red/pink) → gold + blue
  [/text-rose-500/g, "text-accent"],
  [/text-rose-600/g, "text-primary"],
  [/bg-rose-50/g, "bg-yellow-50"],
  [/bg-rose-100/g, "bg-blue-50"],
  [/border-rose-200/g, "border"],
  [/border-rose-800/g, "border"],
  [/dark:bg-rose-950\/20/g, "dark:bg-primary/20"],
  [/text-rose-800/g, "text-foreground"],
  [/bg-rose-600/g, "bg-primary"],

  // Stone / zinc → neutrals (semantic)
  [/bg-zinc-50/g, "bg-background"],
  [/bg-zinc-100/g, "bg-muted"],
  [/text-zinc-500/g, "text-muted-foreground"],
  [/text-zinc-600/g, "text-muted-foreground"],
  [/text-zinc-700/g, "text-foreground"],
  [/text-zinc-900/g, "text-foreground"],
  [/border-zinc-200/g, "border"],

  [/bg-stone-50/g, "bg-background"],
  [/bg-stone-100/g, "bg-muted"],
  [/text-stone-500/g, "text-muted-foreground"],
  [/text-stone-600/g, "text-muted-foreground"],
  [/text-stone-700/g, "text-foreground"],

  // Decorative red → destructive semantic (longer bg-red-* first so bg-red-500 is not truncated)
  [/text-red-900/g, "text-destructive"],
  [/text-red-800/g, "text-destructive"],
  [/text-red-700/g, "text-destructive"],
  [/text-red-600/g, "text-destructive"],
  [/text-red-500/g, "text-destructive"],
  [/bg-red-600/g, "bg-destructive"],
  [/bg-red-500/g, "bg-destructive"],
  [/bg-red-100/g, "bg-muted"],
  [/bg-red-50/g, "bg-muted"],
  [/border-red-200/g, "border"],
  [/border-red-300/g, "border"],
  [/hover:bg-red-50/g, "hover:bg-muted"],
  [/hover:text-red-700/g, "hover:text-destructive"],
  [/hover:bg-red-600/g, "hover:bg-destructive"],
  [/hover:bg-red-700/g, "hover:bg-destructive"],

  // Decorative green → blue family (gold+blue UI)
  [/text-green-900/g, "text-primary"],
  [/text-green-800/g, "text-primary"],
  [/text-green-700/g, "text-primary"],
  [/text-green-600/g, "text-primary"],
  [/text-green-500/g, "text-primary"],
  [/bg-green-900/g, "bg-primary"],
  [/bg-green-800/g, "bg-primary"],
  [/bg-green-700/g, "bg-blue-700"],
  [/bg-green-600/g, "bg-primary"],
  [/bg-green-100/g, "bg-blue-50"],
  [/bg-green-50/g, "bg-primary/20"],
  [/border-green-200/g, "border"],
  [/border-green-300/g, "border"],
  [/border-green-600/g, "border-primary"],
  [/hover:bg-green-50/g, "hover:bg-primary/20"],
  [/hover:bg-green-100/g, "hover:bg-blue-50"],
  [/from-green-/g, "from-blue-"],
  [/to-green-/g, "to-blue-"],
  [/hover:from-green-/g, "hover:from-blue-"],
  [/hover:to-green-/g, "hover:to-blue-"],

  [/border-l-green-500/g, "border-l-primary"],
  [/border-green-500/g, "border-primary"],
  [/hover:border-green-400/g, "hover:border-primary"],
  [/focus:ring-green-500/g, "focus-visible:ring-ring/50"],
  [/focus:ring-green-400/g, "focus-visible:ring-ring/50"],
  [/text-green-400/g, "text-primary"],
  [/text-green-300/g, "text-muted-foreground"],
  [/text-gray-300/g, "text-muted-foreground"],
  [/text-gray-200/g, "text-muted-foreground"],
  [/text-gray-100/g, "text-muted-foreground"],
  [/bg-gray-200/g, "bg-muted"],
  [/bg-gray-300/g, "bg-muted"],

  // yellow-950 / yellow-800 not in precompiled bundle — use supported tokens
  [/text-yellow-950/g, "text-yellow-900"],
  [/dark:bg-yellow-950\/30/g, "dark:bg-primary/20"],
  [/dark:border-yellow-800/g, "dark:border"],
  [/dark:text-yellow-500/g, "dark:text-yellow-400"],
  [/border-yellow-200\/80/g, "border-yellow-200"],
  [/border-yellow-200\/90/g, "border-yellow-200"],
  [/bg-yellow-50\/80/g, "bg-yellow-50"],
  [/bg-yellow-50\/90/g, "bg-yellow-50"],
  [/bg-yellow-50\/60/g, "bg-yellow-50"],
  [/stroke-yellow-300\/90/g, "stroke-yellow-400"],
  [/stroke-yellow-500\/80/g, "stroke-yellow-500"],

  // Slate → semantic (navy primary for dark chrome)
  [/text-slate-400/g, "text-muted-foreground"],
  [/text-slate-300/g, "text-muted-foreground"],
  [/text-slate-500/g, "text-muted-foreground"],
  [/hover:bg-slate-200/g, "hover:bg-muted"],
  [/bg-slate-900/g, "bg-primary"],
  [/bg-slate-950/g, "bg-primary"],
  [/hover:bg-slate-800/g, "hover:bg-blue-800"],
  [/hover:bg-slate-900/g, "hover:bg-blue-800"],
  [/bg-slate-800/g, "bg-blue-800"],
  [/bg-slate-700/g, "bg-blue-700"],
  [/bg-slate-200\/80/g, "bg-muted"],
  [/bg-slate-200/g, "bg-muted"],
  [/bg-slate-100/g, "bg-muted"],
  [/border-slate-300/g, "border"],
  [/border-slate-400/g, "border"],
  [/focus-within:border-slate-400/g, "focus-within:border-primary"],
  [/focus-within:border-slate-300/g, "focus-within:border-primary"],
  [/focus-within:ring-slate-200\/80/g, "focus-within:ring-ring/40"],
  [/focus-within:ring-slate-900\/10/g, "focus-within:ring-ring/30"],
  [/ring-slate-100\/80/g, "shadow-sm"],
  [/ring-slate-200\/60/g, "shadow-sm"],
  [/placeholder:text-slate-400/g, "placeholder:text-muted-foreground"],
  [/divide-slate-100/g, "divide-border"],
  [/border-slate-50/g, "border"],
];


/** Rainbow families → blue / yellow for full gold+blue alignment */
const PALETTE_PREFIX_REPLACE = [
  ["sky-", "blue-"],
  ["indigo-", "blue-"],
  ["cyan-", "blue-"],
  ["teal-", "blue-"],
  ["emerald-", "blue-"],
  ["violet-", "blue-"],
  ["fuchsia-", "blue-"],
  ["orange-", "yellow-"],
  ["lime-", "yellow-"],
  /** Tailwind preset has yellow, not amber — map warning gold-warm tones to yellow */
  ["amber-", "yellow-"],
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name.name))) out.push(full);
  }
  return out;
}

function dedupeBorderClasses(s) {
  return s
    .replace(/\bborder-2 border(?=\s|"|'|$)/g, "border-2")
    .replace(/\bborder border border\b/g, "border")
    .replace(/\bborder border\b/g, "border");
}

let changedFiles = 0;
for (const file of walk(SRC)) {
  let text = fs.readFileSync(file, "utf8");
  const orig = text;
  for (const [re, rep] of REPLACEMENTS) {
    text = text.replace(re, rep);
  }
  for (const [from, to] of PALETTE_PREFIX_REPLACE) {
    text = text.split(from).join(to);
  }
  // Any remaining rose-* utilities → blue scale (after specific rose rules above, re-run safe)
  text = text.replace(/\brose-/g, "blue-");
  text = dedupeBorderClasses(text);
  if (text !== orig) {
    fs.writeFileSync(file, text, "utf8");
    changedFiles++;
    console.log("updated", path.relative(SRC, file));
  }
}
console.log("done,", changedFiles, "files");
