import fs from "fs";
import path from "path";
import * as meriyah from "meriyah";
import * as globby from "globby";

import { generate } from "../src/index";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("Fixtures", () => {
  const fixtures = globby.sync("**.js", {
    cwd: FIXTURES_DIR,
  });

  for (let fixture of fixtures) {
    const filepath = path.join(FIXTURES_DIR, fixture);

    it(`Fixture ${fixture}`, () => {
      const content = fs.readFileSync(filepath, "utf-8");

      const inputAST = meriyah.parseModule(content, {
        module: true,
        webcompat: true,
        directives: true,
        next: true,
        raw: true,
        jsx: true,
        loc: false,
        ranges: false,
      });

      const output = generate(inputAST);
      const outputAST = meriyah.parseModule(output, {
        module: true,
        webcompat: true,
        directives: true,
        next: true,
        raw: true,
        jsx: true,
        loc: false,
        ranges: false,
      });

      try {
        expect(outputAST).toEqual(inputAST);
      } catch (err) {
        console.error(output);
        throw err;
      }
    });
  }
});
