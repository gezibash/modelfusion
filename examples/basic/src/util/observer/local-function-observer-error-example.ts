import dotenv from "dotenv";
import { generateText, openai } from "modelfusion";
import { customObserver } from "./custom-observer";

dotenv.config();

async function main() {
  // Set the observer on the function call:
  const text = await generateText(
    openai.CompletionTextGenerator({
      api: openai.Api({
        baseUrl: "invalid-url",
      }),
      model: "gpt-3.5-turbo-instruct",
      maxGenerationTokens: 50,
    }),
    "Write a short story about a robot named Nox:\n\n",
    { observers: [customObserver] }
  );
}

main().catch(console.error);
