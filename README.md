# Meriyah Printer

Tiny and fast JavaScript code generator that is compatible with all nodes meriyah supports.

A work in progress...

## Usage

```JS
import * as meriyah from 'meriyah';
import { generate } from 'meriyah-printer';

const ast = meriyah.parseModule(code, {
  module: true,
  webcompat: true,
  directives: true,
  next: true,
  raw: true,
  jsx: true,
});

const code = generate(ast);
```
