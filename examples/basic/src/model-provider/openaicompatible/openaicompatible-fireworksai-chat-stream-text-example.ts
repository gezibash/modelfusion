import dotenv from "dotenv";
import { openaicompatible, streamText } from "modelfusion";

dotenv.config();

async function main() {
  const textStream = await streamText(
    openaicompatible
      .ChatTextGenerator({
        api: openaicompatible.FireworksAIApi(),
        model: "accounts/fireworks/models/mistral-7b",
      })
      .withTextPrompt(),

    "Write a story about a robot learning to love"
  );

  for await (const textPart of textStream) {
    process.stdout.write(textPart);
  }
}

main().catch(console.error);
