---
sidebar_position: 25
title: Vercel AI SDK
---

# Using the Vercel AI SDK with ModelFusion

The [Vercel AI SDK](https://github.com/vercel/ai) is a library for building AI-powered streaming text and chat UIs. It provides hooks for React, Svelte, Vue, and Solid to easily integrate streaming AI responses into your web application. You can use the Vercel AI SDK with ModelFusion streams out of the box.

The ModelFusion extension `@modelfusion/vercel-ai` ([source code](https://github.com/lgrammel/modelfusion/tree/main/extensions/vercel-ai)) provides a helper function to convert ModelFusion streams to a format that is compatible with the Vercel AI SDK.

You can install it using npm:

```sh
npm install @modelfusion/vercel-ai
```

## Ollama Example

[Ollama](https://ollama.ai/) lets you run AI models locally on your machine.

Here is an example of a Next.js route that you can call from the Vercel AI `useChat` hook:

```ts
// app/api/chat/route.ts
import { asChatMessages, ModelFusionTextStream } from "@modelfusion/vercel-ai";
import { Message, StreamingTextResponse } from "ai";
import { ollama, streamText } from "modelfusion";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  // Use ModelFusion to call Ollama:
  const textStream = await streamText(
    ollama.ChatTextGenerator({ model: "llama2:chat" }).withChatPrompt(),
    {
      system:
        "You are an AI chat bot. " +
        "Follow the user's instructions carefully.",

      // map Vercel AI SDK Message to ModelFusion ChatMessage:
      messages: asChatMessages(messages),
    }
  );

  // Return the result using the Vercel AI SDK:
  return new StreamingTextResponse(
    // Convert the text stream to a Vercel AI SDK compatible stream:
    ModelFusionTextStream(
      textStream,
      // optional callbacks:
      {
        onStart() {
          console.log("onStart");
        },
        onToken(token) {
          console.log("onToken", token);
        },
        onCompletion: () => {
          console.log("onCompletion");
        },
        onFinal(completion) {
          console.log("onFinal", completion);
        },
      }
    )
  );
}
```

You can find more examples in the [Next.js, Vercel AI SDK, Ollama & ModelFusion starter](https://github.com/lgrammel/modelfusion-ollama-nextjs-starter) and the [Next.js, Vercel AI SDK, llama.cpp & ModelFusion starter](https://github.com/lgrammel/modelfusion-llamacpp-nextjs-starter).
