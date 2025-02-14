import { FunctionOptions } from "../../core/FunctionOptions.js";
import { AsyncQueue } from "../../util/AsyncQueue.js";
import { ModelCallMetadata } from "../ModelCallMetadata.js";
import { executeStreamCall } from "../executeStreamCall.js";
import {
  SpeechGenerationModelSettings,
  StreamingSpeechGenerationModel,
} from "./SpeechGenerationModel.js";

/**
 * Stream synthesized speech from text. Also called text-to-speech (TTS).
 * Duplex streaming where both the input and output are streamed is supported.
 *
 * @see https://modelfusion.dev/guide/function/generate-speech
 *
 * @example
 * const textStream = await streamText(...);
 *
 * const speechStream = await streamSpeech(
 *   elevenlabs.SpeechGenerator(...),
 *   textStream
 * );
 *
 * for await (const speechPart of speechStream) {
 *   // ...
 * }
 *
 * @param {StreamingSpeechGenerationModel<SpeechGenerationModelSettings>} model - The speech generation model.
 * @param {AsyncIterable<string> | string} text - The text to be converted to speech. Can be a string or an async iterable of strings.
 * @param {FunctionOptions} [options] - Optional function options.
 *
 * @returns {AsyncIterableResultPromise<Buffer>} An async iterable promise that contains the synthesized speech chunks.
 */
export async function streamSpeech(
  model: StreamingSpeechGenerationModel<SpeechGenerationModelSettings>,
  text: AsyncIterable<string> | string,
  options?: FunctionOptions & { fullResponse?: false }
): Promise<AsyncIterable<Buffer>>;
export async function streamSpeech(
  model: StreamingSpeechGenerationModel<SpeechGenerationModelSettings>,
  text: AsyncIterable<string> | string,
  options: FunctionOptions & { fullResponse: true }
): Promise<{
  speechStream: AsyncIterable<Buffer>;
  metadata: Omit<ModelCallMetadata, "durationInMs" | "finishTimestamp">;
}>;
export async function streamSpeech(
  model: StreamingSpeechGenerationModel<SpeechGenerationModelSettings>,
  text: AsyncIterable<string> | string,
  options?: FunctionOptions & { fullResponse?: boolean }
): Promise<
  | AsyncIterable<Buffer>
  | {
      speechStream: AsyncIterable<Buffer>;
      metadata: Omit<ModelCallMetadata, "durationInMs" | "finishTimestamp">;
    }
> {
  let textStream: AsyncIterable<string>;

  // simulate a stream with a single value for a string input:
  if (typeof text === "string") {
    const queue = new AsyncQueue<string>();
    queue.push(text);
    queue.close();
    textStream = queue;
  } else {
    textStream = text;
  }

  const fullResponse = await executeStreamCall({
    functionType: "stream-speech",
    input: text,
    model,
    options,
    startStream: async (options) =>
      model.doGenerateSpeechStreamDuplex(textStream, options),
    processDelta: (delta) => delta.deltaValue,
  });

  return options?.fullResponse
    ? {
        speechStream: fullResponse.value,
        metadata: fullResponse.metadata,
      }
    : fullResponse.value;
}
