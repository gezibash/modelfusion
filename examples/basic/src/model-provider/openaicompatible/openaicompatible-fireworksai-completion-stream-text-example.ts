import dotenv from "dotenv";
import { openaicompatible, streamText } from "modelfusion";

dotenv.config();

async function main() {
  const textStream = await streamText(
    openaicompatible.CompletionTextGenerator({
      api: openaicompatible.FireworksAIApi(),
      model: "accounts/fireworks/models/mistral-7b",
      maxGenerationTokens: 500,
    }),

    "Write a story about a robot learning to love"
  );

  for await (const textPart of textStream) {
    process.stdout.write(textPart);
  }
}

main().catch(console.error);
