# Math.js Tool for ModelFusion

[Math.js](https://mathjs.org) is a JavaScript library for evaluating mathematical expressions.

## Installation

```sh
npm install @modelfusion/mathjs-tool
```

## Usage

```ts
import { MathJsTool } from "@modelfusion/mathjs-tool";

const mathTool = new MathJsTool({
  name: "math",
});
```

You can then use the tool with `useTool` or `executeTool`:

```ts
const result = await executeTool(mathTool, {
  expression: "2 + 2",
});
```
