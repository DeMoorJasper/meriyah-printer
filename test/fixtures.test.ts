import fs from "fs";
import path from "path";
import * as meriyah from "meriyah";
import * as globby from "globby";

import { generate } from "../src/index";

function testFixture(filepath: string, isModule: boolean = true) {
  const parse = isModule ? meriyah.parseModule : meriyah.parseScript;
  const input = fs.readFileSync(filepath, "utf-8");
  const inputAST = parse(input, {
    module: isModule,
    webcompat: true,
    directives: false,
    next: true,
    raw: true,
    jsx: true,
    loc: false,
    ranges: false,
  });

  const output = generate(inputAST);
  const outputAST = parse(output, {
    module: isModule,
    webcompat: true,
    directives: false,
    next: true,
    raw: true,
    jsx: true,
    loc: false,
    ranges: false,
  });

  try {
    expect(outputAST).toEqual(inputAST);
  } catch (err) {
    console.error("=== INPUT ===\n" + input + "\n\n=== OUTPUT ===\n" + output);
    throw err;
  }
}

describe("Fixtures", () => {
  const FIXTURES_DIR = path.join(__dirname, "fixtures");
  const fixtures = globby.sync("**.js", {
    cwd: FIXTURES_DIR,
  });

  for (let fixture of fixtures) {
    it(`Fixtures: ${fixture}`, () => {
      const filepath = path.join(FIXTURES_DIR, fixture);
      testFixture(filepath);
    });
  }
});

describe("test262-parser-tests modules", () => {
  const TEST_262_DIR = path.join(
    __dirname,
    "../node_modules/test262-parser-tests/pass"
  );
  const fixtures = globby.sync("**.module.js", {
    cwd: TEST_262_DIR,
  });

  for (let fixture of fixtures) {
    it(`test262 module: ${fixture}`, () => {
      const filepath = path.join(TEST_262_DIR, fixture);
      testFixture(filepath);
    });
  }
});

describe("test262-parser-tests scripts", () => {
  // These don't compile with meriyah...
  const SKIPPED_FIXTURES = new Set([
    "596746323492fbfd.js",
    "5c3d125ce5f032aa.js",
    "660f5a175a2d46ac.js",
    "818ea8eaeef8b3da.js",
    "c85fbdb8c97e0534.js",
    "dafb7abe5b9b44f5.js",
    "eaee2c64dfc46b6a.js",
    "f5b89028dfa29f27.js",
    "f7f611e6fdb5b9fc.js",
  ]);
  const TEST_262_DIR = path.join(
    __dirname,
    "../node_modules/test262-parser-tests/pass"
  );
  const fixtures = globby
    .sync("**.js", {
      cwd: TEST_262_DIR,
    })
    .filter((f) => !f.endsWith(".module.js") && !SKIPPED_FIXTURES.has(f));

  for (let fixture of fixtures) {
    it(`test262 script: ${fixture}`, () => {
      const filepath = path.join(TEST_262_DIR, fixture);
      testFixture(filepath, false);
    });
  }
});
