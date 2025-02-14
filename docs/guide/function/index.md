---
sidebar_position: 2
title: Model Functions
---

# Model Functions

ModelFusion provides model functions for tasks such as [text generation](/guide/function/generate-text) that are executed using machine learning models (e.g., LLMs).
You can call these functions with a model, a prompt, and additional [FunctionOptions](/api/modules#functionoptions).

```ts
import { generateText, openai } from "modelfusion";

const text = await generateText(
  // model:
  openai.CompletionTextGenerator({ model: "gpt-3.5-turbo-instruct" }),

  // prompt (type depends on model):
  "Write a short story about a robot learning to love:\n\n",

  // additional configuration (all optional):
  {
    functionId, // function identifier for logging
    logging, // logging configuration
    observers, // call observers
    run, // run object
  }
);
```

## Streaming Functions

Some model functions have a streaming variant, e.g. `streamText` or `streamSpeech`. The streaming functions return `AsyncIterable` objects and might only work with some models.

## Rich Responses

For more advanced use cases, you might want to access the full response from the model, or the metadata about the call.
Model functions return rich results that include the original response and metadata when you set the `fullResponse` option to `true`.

```ts
import { generateText, openai } from "modelfusion";

// access the full response (needs to be typed) and the metadata:
const { text, texts, response, metadata } = await generateText(
  openai.CompletionTextGenerator({
    model: "gpt-3.5-turbo-instruct",
    maxGenerationTokens: 1000,
    n: 2, // generate 2 completions
  }),
  "Write a short story about a robot learning to love:\n\n"
  { fullResponse: true }
);

console.log(metadata);

// cast to the response type:
for (const choice of (response as OpenAICompletionResponse).choices) {
  console.log(choice.text);
}
```

## Models

Models provide a unified interface to AI models from different [providers](/integration/model-provider/). Models offer the following functionality:

- **Standardized API:** Models provide a standardized API for the tasks that they support. You can use e.g. [ImageGenerationModel](/api/interfaces/ImageGenerationModel)s to [generate images](/guide/function/generate-image), and [TextGenerationModel](/api/interfaces/TextGenerationModel)s to [generate text](/guide/function/generate-text).
- **Settings:** You can configure settings that you can use across many calls to the model, such as the temperature for text generation.
- **Model capability information:** Models provide information about the underlying API capabilities, such as token limits.
- **Fault tolerance**: You can configure retry strategies, throttling, etc.

### Usage

#### new Model

Models are created using a constructor call. The constructors take a single configuration object as an argument. The configuration object is specific to the model.

```ts
import { openai } from "modelfusion";

const model = openai.CompletionTextGenerator({
  model: "gpt-3.5-turbo-instruct",
  maxGenerationTokens: 500,
});
```

You can pass API configuration objects to the model constructors to configure the underlying API calls. There are preconfigured API configurations for each provider that you can use. The [API configuration](/api/interfaces/ApiConfiguration) contains api keys, base URLs, as well as throttling and retry functions.

```ts
import { api, openai } from "modelfusion";

openai.CompletionTextGenerator({
  model: "gpt-3.5-turbo-instruct",
  api: openai.Api({
    // all parameters are optional:
    apiKey: "my-api-key",
    baseUrl: {
      host: "my-proxy-host",
    },
    retry: api.retryWithExponentialBackoff({ maxTries: 5 }),
    throttle: api.throttleOff(),
  }),
});
```

#### withSettings

The `withSettings` method creates a new model with the same configuration as the original model, but with the specified settings changed.

```ts
const modelWithMoreTokens = model.withSettings({
  maxGenerationTokens: 1000,
});
```
