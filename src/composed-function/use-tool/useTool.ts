import { FunctionOptions } from "../../model-function/FunctionOptions.js";
import {
  GenerateJsonModel,
  GenerateJsonModelSettings,
  GenerateJsonPrompt,
} from "../../model-function/generate-json/GenerateJsonModel.js";
import {
  GenerateJsonOrTextModel,
  GenerateJsonOrTextModelSettings,
  GenerateJsonOrTextPrompt,
} from "../../model-function/generate-json/GenerateJsonOrTextModel.js";
import { generateJson } from "../../model-function/generate-json/generateJson.js";
import { generateJsonOrText } from "../../model-function/generate-json/generateJsonOrText.js";
import { NoSuchToolError } from "./NoSuchToolError.js";
import { Tool } from "./Tool.js";

// In this file, using 'any' is required to allow for flexibility in the inputs. The actual types are
// retrieved through lookups such as TOOL["name"], such that any does not affect any client.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * `useTool` uses `generateJson` to generate parameters for a tool and then executes the tool with the parameters.
 *
 * @returns The result contains the name of the tool (`tool` property),
 * the parameters (`parameters` property, typed),
 * and the result of the tool execution (`result` property, typed).
 */
export async function useTool<
  PROMPT,
  RESPONSE,
  SETTINGS extends GenerateJsonModelSettings,
  TOOL extends Tool<any, any, any>,
>(
  model: GenerateJsonModel<PROMPT, RESPONSE, SETTINGS>,
  tool: TOOL,
  prompt: (tool: TOOL) => PROMPT & GenerateJsonPrompt<RESPONSE>,
  options?: FunctionOptions<SETTINGS>
): Promise<{
  tool: TOOL["name"];
  parameters: TOOL["inputSchema"];
  result: Awaited<ReturnType<TOOL["execute"]>>;
}> {
  const { value } = await generateJson<
    TOOL["inputSchema"],
    PROMPT,
    RESPONSE,
    TOOL["name"],
    SETTINGS
  >(
    model,
    {
      name: tool.name,
      description: tool.description,
      schema: tool.inputSchema,
    },
    () => prompt(tool),
    {
      ...(options ?? {}),
      fullResponse: true,
    }
  );

  return {
    tool: tool.name,
    parameters: value,
    result: await tool.execute(value),
  };
}

// [ { name: "n", ... } | { ... } ]
type ToolArray<T extends Tool<any, any, any>[]> = T;

// { n: { name: "n", ... }, ... }
type ToToolMap<T extends ToolArray<Tool<any, any, any>[]>> = {
  [K in T[number]["name"]]: Extract<T[number], Tool<K, any, any>>;
};

// { tool: "n", result: ... } | { ... }
type ToToolUnion<T> = {
  [KEY in keyof T]: T[KEY] extends Tool<any, infer INPUT, infer OUTPUT>
    ? { tool: KEY; parameters: INPUT; result: OUTPUT; text: string | null }
    : never;
}[keyof T];

type ToOutputValue<TOOLS extends ToolArray<Tool<any, any, any>[]>> =
  ToToolUnion<ToToolMap<TOOLS>>;

export async function useToolOrGenerateText<
  PROMPT,
  RESPONSE,
  SETTINGS extends GenerateJsonOrTextModelSettings,
  TOOLS extends Array<Tool<any, any, any>>,
>(
  model: GenerateJsonOrTextModel<PROMPT, RESPONSE, SETTINGS>,
  tools: TOOLS,
  prompt: (tools: TOOLS) => PROMPT & GenerateJsonOrTextPrompt<RESPONSE>,
  options?: FunctionOptions<SETTINGS>
): Promise<
  | { tool: null; parameters: null; result: null; text: string }
  | ToOutputValue<TOOLS>
> {
  const expandedPrompt = prompt(tools);

  const modelResponse = await generateJsonOrText(
    model,
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      schema: tool.inputSchema,
    })),
    () => expandedPrompt,
    options
  );

  const { schema, text } = modelResponse;

  if (schema == null) {
    return {
      tool: null,
      parameters: null,
      result: null,
      text,
    };
  }

  const tool = tools.find((tool) => tool.name === schema);

  if (tool == null) {
    throw new NoSuchToolError(schema.toString());
  }

  const toolParameters = modelResponse.value;

  const result = await tool.execute(toolParameters);

  return {
    tool: schema as keyof ToToolMap<TOOLS>,
    result,
    parameters: toolParameters,
    text: text as any, // string | null is the expected value here
  };
}
