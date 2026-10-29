// Headless e2e + screenshot check against `vite preview`. Not part of the build; run by hand:
//   npm run build && npx vite preview --port 4173 & node scripts/e2e-shots.mjs
// Needs playwright-core and axe-core installed in <NODE_PATH>/node_modules and a Chrome binary (CHROME).
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(
  process.env.NODE_PATH ? `${process.env.NODE_PATH}/x.js` : import.meta.url,
);
const { chromium } = require("playwright-core");
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const URL_ = process.env.APP_URL ?? "http://localhost:4173/tictactoe-game/";
const OUT = process.env.OUT ?? "/workspace/projects/arcade-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
const problems = [];

async function check(page, label, viewport) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow > 0) problems.push(`${label}: horizontal overflow ${overflow}px`);
  await page.evaluate(axeSource);
  const axe = await page.evaluate(() =>
    axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] }),
  );
  for (const v of axe.violations)
    problems.push(`${label}: axe ${v.id} (${v.impact}) x${v.nodes.length}`);
  // Tap targets on the phone: every button, and every checkbox's label, should be at least 24px tall (WCAG 2.2 minimum target).
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button, input[type=checkbox]")]
      .filter((el) => (el.closest("label") ?? el).getBoundingClientRect().height < 24)
      .map((el) => el.textContent?.trim() || el.getAttribute("aria-label")),
  );
  if (small.length) problems.push(`${label}: tiny controls ${small.join(", ")}`);
  console.log(
    label,
    `${viewport.width}px`,
    "overflow:",
    overflow,
    "axe violations:",
    axe.violations.length,
  );
}

async function run(theme, viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  await ctx.addInitScript((t) => {
    localStorage.setItem("arcade.v1.theme", JSON.stringify(t));
    localStorage.setItem(
      "arcade.v1.ttt",
      JSON.stringify({ difficulty: "perfect", first: "you", showWhy: true }),
    );
  }, theme);
  const page = await ctx.newPage();
  const external = new Set();
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.hostname !== "localhost") external.add(u.hostname);
  });
  page.on("pageerror", (e) => problems.push(`${theme}-${viewport.width}: pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`${theme}-${viewport.width}: console ${m.text()}`);
  });
  await page.goto(URL_, { waitUntil: "networkidle" });
  if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== theme)
    problems.push(`${theme}-${viewport.width}: theme not applied`);

  // Tic-tac-toe, mid-game, with the AI's reasoning showing.
  await page.getByRole("button", { name: "top left, empty" }).click();
  await page.getByRole("button", { name: "centre, O" }).waitFor();
  await page.getByRole("button", { name: "bottom right, empty" }).click();
  await page.getByRole("status").filter({ hasText: "Your turn" }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[aria-label$=", O"]').length === 2);
  await page.getByRole("heading", { name: "Why the AI played that" }).waitFor();
  const labelTtt = `${theme}-${viewport.width}-ttt`;
  await page.screenshot({ path: `${OUT}/${labelTtt}.png`, fullPage: true });
  await check(page, labelTtt, viewport);

  // Rock-paper-scissors after a run of rounds with a simple pattern the bot can learn.
  await page.getByRole("tab", { name: "Rock-paper-scissors" }).click();
  await page.getByRole("group", { name: "Your move" }).waitFor();
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("rps"[i % 3]);
  }
  const rounds = await page
    .getByText("Rounds", { exact: true })
    .locator("xpath=../dd")
    .textContent();
  if (rounds !== "24")
    problems.push(`${theme}-${viewport.width}: expected 24 rounds, got ${rounds}`);
  const labelRps = `${theme}-${viewport.width}-rps`;
  await page.screenshot({ path: `${OUT}/${labelRps}.png`, fullPage: true });
  await check(page, labelRps, viewport);

  if (external.size)
    problems.push(`${theme}-${viewport.width}: external requests to ${[...external].join(",")}`);
  await ctx.close();
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  for (const theme of ["light", "dark", "contrast"]) await run(theme, viewport);
}

await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "e2e: no problems");
process.exit(problems.length ? 1 : 0);
