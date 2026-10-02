#!/usr/bin/env node
"use strict";

// Compatibility entry point. The supported suites now exercise the production
// pure preparer and exact-byte family journal, including all seven profiles.
// The old shallow-overwrite and replaceable-backup expectations were unsafe.
// Run individually with:
//   node tests/craepets-family-restore.cjs
//   node tests/craepets-auto-seeding.cjs
require("./craepets-family-restore.cjs");
require("./craepets-auto-seeding.cjs");
