import dotenv from "dotenv";
import { generateText, guard, modelfusion, openai } from "modelfusion";

dotenv.config();

modelfusion.setLogFormat("detailed-object");

async function main() {
  const story = await guard(
    (input, options) =>
      generateText(
        openai.CompletionTextGenerator({
          model: "gpt-3.5-turbo-instruct",
          temperature: 0.7,
          maxGenerationTokens: 500,
        }),
        input,
        options
      ),
    "Write a short story about a robot called Nox:\n\n",
    async (result) => {
      if (result.type === "value") {
        // count the number of times the word "Nox" appears:
        const count = (result.output.match(/Nox/g) ?? []).length;

        // if the word "Nox" appears less than 12 times, retry
        if (count < 12) {
          return {
            action: "retry",
            input: [
              result.output,
              "Rewrite the story such that the word 'Nox' appears at least 12 times.",
            ].join("\n\n"),
          };
        }
      }
    }
  );

  console.log(story);
}

main().catch(console.error);
