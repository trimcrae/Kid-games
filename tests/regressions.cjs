#!/usr/bin/env node
"use strict";

// Each suite owns its server/browser. Run them in order so failures remain
// readable and one stalled browser cannot block all the remaining checks.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const suites = [
  { file: "life-prediction-credit.cjs", timeout: 15000 },
  { file: "life-prediction-credit-browser.cjs", timeout: 120000, browser: true },
  { file: "craepets-game-active-save.cjs", timeout: 30000 },
  { file: "craepets-game-active-save-browser.cjs", timeout: 180000, browser: true },
  { file: "craepets-active-save.cjs", timeout: 30000 },
  { file: "craepets-active-save-browser.cjs", timeout: 120000, browser: true },
  { file: "craepets-auto-seeding.cjs", timeout: 30000 },
  { file: "craepets-auto-seeding-browser.cjs", timeout: 120000, browser: true },
  { file: "craepets-family-restore.cjs", timeout: 30000 },
  { file: "craepets-family-restore-browser.cjs", timeout: 120000, browser: true },
  { file: "post-office-storage.cjs", timeout: 15000 },
  { file: "post-office-storage-browser.cjs", timeout: 120000, browser: true },
  { file: "craepets-import.cjs", timeout: 15000 },
  { file: "craepets-import-browser.cjs", timeout: 120000, browser: true },
  { file: "shared-media-lifecycle.cjs", timeout: 15000 },
  { file: "photo-daily-assignment.cjs", timeout: 15000 },
  { file: "arcade-usability.cjs", timeout: 60000, browser: true },
  { file: "math-reliability.test.js", timeout: 90000, browser: true },
  { file: "service-worker.cjs", timeout: 90000, browser: true },
  { file: "young-games-regressions.js", timeout: 90000, browser: true },
  { file: "word-puzzles-lifecycle.cjs", timeout: 90000, browser: true },
  { file: "three-model-visuals.cjs", timeout: 300000, browser: true },
  { file: "coordinate-round-guard.cjs", timeout: 15000 },
  { file: "coordinate-round-guard-browser.cjs", timeout: 180000, browser: true },
  { file: "rock-quiz-resume.cjs", timeout: 15000 },
  { file: "rock-quiz-resume-browser.cjs", timeout: 180000, browser: true },
];

let active;
let interrupted;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    interrupted = signal;
    if (active) active.stop(signal);
  });
}

function stopProcess(child, signal) {
  try {
    // Give Playwright's signal handlers a chance to close Chromium, and
    // stop the suite's own process group so its server cannot keep running.
    if (process.platform !== "win32") process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (error) {
    if (error.code !== "ESRCH") console.error(`Could not stop ${child.pid}: ${error.message}`);
  }
}

function runSuite(suite, env) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join(__dirname, suite.file)], {
      cwd: __dirname,
      env,
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    let timedOut = false;
    let launchError;
    let forceStop;
    const stop = (signal) => {
      if (!child.pid || forceStop) return;
      stopProcess(child, signal);
      forceStop = setTimeout(() => stopProcess(child, "SIGKILL"), 2000);
    };
    active = { stop };
    const timer = setTimeout(() => {
      timedOut = true;
      console.error(`\nTIMEOUT: ${suite.file} exceeded ${suite.timeout / 1000}s`);
      stop("SIGTERM");
    }, suite.timeout);
    child.on("error", (error) => { launchError = error; });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      clearTimeout(forceStop);
      active = undefined;
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      let failure;
      if (launchError) failure = launchError.message;
      else if (timedOut) failure = `timed out after ${suite.timeout / 1000}s`;
      else if (signal) failure = `stopped by ${signal}`;
      else if (code !== 0) failure = `exited with status ${code}`;
      console.log(`${failure ? "FAIL" : "PASS"}: ${suite.file} (${seconds}s)${failure ? ` — ${failure}` : ""}`);
      resolve({ file: suite.file, failure });
    });
  });
}

async function main() {
  const requested = process.argv.slice(2);
  const unknown = requested.filter((file) => !suites.some((suite) => suite.file === file));
  if (unknown.length) throw new Error(`Unknown suites: ${unknown.join(", ")}. Choose: ${suites.map((suite) => suite.file).join(", ")}`);
  const selected = requested.length ? suites.filter((suite) => requested.includes(suite.file)) : suites;
  for (const { file } of selected) {
    if (!fs.existsSync(path.join(__dirname, file))) throw new Error(`Missing regression suite: ${file}`);
  }

  const env = { ...process.env };
  if (selected.some((suite) => suite.browser)) {
    let chromium;
    try { ({ chromium } = require("playwright-core")); }
    catch { throw new Error("Install the test dependency first: cd tests && npm install"); }
    const browserPath = process.env.CHROMIUM_PATH || [chromium.executablePath(), "/usr/bin/chromium", "/usr/bin/chromium-browser"]
      .find((candidate) => fs.existsSync(candidate));
    if (!browserPath || !fs.existsSync(browserPath)) {
      throw new Error("Chromium was not found. Run node node_modules/playwright-core/cli.js install chromium in tests/, or set CHROMIUM_PATH to an installed browser.");
    }
    env.CHROMIUM_PATH = browserPath;
  }
  console.log(`Running ${selected.length} focused regression suites${selected.some((suite) => suite.browser) ? ` with ${env.CHROMIUM_PATH}` : ""}`);
  const results = [];
  for (const suite of selected) {
    if (interrupted) break;
    console.log(`\n--- ${suite.file} ---`);
    results.push(await runSuite(suite, env));
  }
  const failures = results.filter((result) => result.failure);
  console.log(`\nRegressions: ${results.length - failures.length}/${selected.length} passed.`);
  for (const { file, failure } of failures) console.error(`  ${file}: ${failure}`);
  if (interrupted) {
    console.error(`Regression run interrupted by ${interrupted}.`);
    process.exitCode = interrupted === "SIGINT" ? 130 : 143;
  } else if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
