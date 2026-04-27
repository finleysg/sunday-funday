export default {
  // TS/JS source: ESLint --fix then Prettier.
  "src/**/*.{ts,tsx,js,jsx}": (filenames) => [
    `eslint --fix ${filenames.join(" ")}`,
    `prettier --write ${filenames.join(" ")}`,
  ],

  // Prisma schema: format via Prisma's built-in formatter.
  "prisma/**/*.prisma": ["prisma format --schema"],

  // Everything else (configs, docs, styles): just Prettier.
  "*.{json,md,yml,yaml,css,scss,mjs,cjs}": ["prettier --write"],
};
