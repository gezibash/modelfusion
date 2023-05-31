import { createId } from "@paralleldrive/cuid2";
import {
  GenerateCallEndEvent,
  GenerateCallStartEvent,
} from "run/GenerateCallEvent.js";
import { Prompt } from "../../prompt/Prompt.js";
import { RunContext } from "../../run/RunContext.js";
import { RunFunction } from "../../run/RunFunction.js";
import { AbortError } from "../../util/AbortError.js";
import { RetryFunction } from "../../util/RetryFunction.js";
import { retryWithExponentialBackoff } from "../../util/retryWithExponentialBackoff.js";
import { GenerateModel } from "./GenerateModel.js";

export async function generate<
  INPUT,
  PROMPT_TYPE,
  RAW_OUTPUT,
  GENERATED_OUTPUT,
  OUTPUT
>(
  input: Parameters<
    typeof safeGenerate<
      INPUT,
      PROMPT_TYPE,
      RAW_OUTPUT,
      GENERATED_OUTPUT,
      OUTPUT
    >
  >[0],
  context?: RunContext
): Promise<OUTPUT> {
  const result = await safeGenerate(input, context);

  if (!result.ok) {
    if (result.isAborted) {
      throw new AbortError("The generation was aborted.");
    }

    throw result.error;
  }

  return result.result;
}

generate.asFunction =
  <INPUT, PROMPT_TYPE, RAW_OUTPUT, GENERATED_OUTPUT, OUTPUT>(options: {
    functionId?: string | undefined;
    prompt: Prompt<INPUT, PROMPT_TYPE>;
    model: GenerateModel<PROMPT_TYPE, RAW_OUTPUT, GENERATED_OUTPUT>;
    extractOutput?: (output: RAW_OUTPUT) => PromiseLike<GENERATED_OUTPUT>;
    processOutput: (output: GENERATED_OUTPUT) => PromiseLike<OUTPUT>;
    retry?: RetryFunction;
    onCallStart?: (call: GenerateCallStartEvent) => void;
    onCallEnd?: (call: GenerateCallEndEvent) => void;
  }): RunFunction<INPUT, OUTPUT> =>
  async (input: INPUT, context?: RunContext) =>
    generate({ input, ...options }, context);

generate.safe = safeGenerate;

generate.asSafeFunction =
  <INPUT, PROMPT_TYPE, RAW_OUTPUT, GENERATED_OUTPUT, OUTPUT>(options: {
    functionId?: string | undefined;
    prompt: Prompt<INPUT, PROMPT_TYPE>;
    model: GenerateModel<PROMPT_TYPE, RAW_OUTPUT, GENERATED_OUTPUT>;
    extractOutput?: (output: RAW_OUTPUT) => PromiseLike<GENERATED_OUTPUT>;
    processOutput: (output: GENERATED_OUTPUT) => PromiseLike<OUTPUT>;
    retry?: RetryFunction;
    onCallStart?: (call: GenerateCallStartEvent) => void;
    onCallEnd?: (call: GenerateCallEndEvent) => void;
  }) =>
  async (input: INPUT, context?: RunContext) =>
    safeGenerate({ input, ...options }, context);

async function safeGenerate<
  INPUT,
  PROMPT_TYPE,
  RAW_OUTPUT,
  GENERATED_OUTPUT,
  OUTPUT
>(
  {
    functionId,
    prompt,
    input,
    model,
    processOutput,
    extractOutput = model.extractOutput,
    retry = retryWithExponentialBackoff(),
    onCallStart,
    onCallEnd,
  }: {
    functionId?: string | undefined;
    input: INPUT;
    prompt: Prompt<INPUT, PROMPT_TYPE>;
    model: GenerateModel<PROMPT_TYPE, RAW_OUTPUT, GENERATED_OUTPUT>;
    extractOutput?: (output: RAW_OUTPUT) => PromiseLike<GENERATED_OUTPUT>;
    processOutput: (output: GENERATED_OUTPUT) => PromiseLike<OUTPUT>;
    retry?: RetryFunction;
    onCallStart?: (call: GenerateCallStartEvent) => void;
    onCallEnd?: (call: GenerateCallEndEvent) => void;
  },
  context?: RunContext
): Promise<
  | { ok: true; result: OUTPUT }
  | { ok: false; isAborted: boolean; error?: unknown }
> {
  const expandedPrompt = await prompt(input);

  const startTime = performance.now();
  const startEpochSeconds = Math.floor(
    (performance.timeOrigin + startTime) / 1000
  );

  const callId = createId();

  const startMetadata = {
    callId,
    functionId,
    runId: context?.runId,
    sessionId: context?.sessionId,
    userId: context?.userId,

    model: {
      vendor: model.vendor,
      name: model.model,
    },
    startEpochSeconds,
  };

  const callStartEvent: GenerateCallStartEvent = {
    type: "generate-start",
    metadata: startMetadata,
    input: expandedPrompt,
  };

  onCallStart?.(callStartEvent);
  context?.onCallStart?.(callStartEvent);

  const rawOutput = await retry(() =>
    model.generate(expandedPrompt, {
      abortSignal: context?.abortSignal,
    })
  );

  const textGenerationDurationInMs = Math.ceil(performance.now() - startTime);

  const metadata = {
    durationInMs: textGenerationDurationInMs,
    tries: rawOutput.tries,
    ...startMetadata,
  };

  if (rawOutput.status === "failure") {
    const callEndEvent: GenerateCallEndEvent = {
      type: "generate-end",
      status: "failure",
      metadata,
      input: expandedPrompt,
      error: rawOutput.error,
    };

    onCallEnd?.(callEndEvent);
    context?.onCallEnd?.(callEndEvent);

    return { ok: false, isAborted: false, error: rawOutput.error };
  }

  if (rawOutput.status === "abort") {
    const callEndEvent: GenerateCallEndEvent = {
      type: "generate-end",
      status: "abort",
      metadata,
      input: expandedPrompt,
    };

    onCallEnd?.(callEndEvent);
    context?.onCallEnd?.(callEndEvent);

    return { ok: false, isAborted: true };
  }

  const extractedOutput = await extractOutput(rawOutput.result);
  const processedOutput = await processOutput(extractedOutput);

  const callEndEvent: GenerateCallEndEvent = {
    type: "generate-end",
    status: "success",
    metadata,
    input: expandedPrompt,
    rawOutput: rawOutput.result,
    extractedOutput,
    processedOutput,
  };

  onCallEnd?.(callEndEvent);
  context?.onCallEnd?.(callEndEvent);

  return { ok: true, result: processedOutput };
}
