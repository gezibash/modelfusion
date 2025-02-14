import dotenv from "dotenv";
import { generateText, openai, api } from "modelfusion";

dotenv.config();

async function main() {
  const text = await generateText(
    openai.CompletionTextGenerator({
      model: "gpt-3.5-turbo-instruct",
      api: openai.Api({
        // all parameters are optional:
        apiKey: "my-api-key",
        baseUrl: { host: "custom-host" },
        retry: api.retryWithExponentialBackoff({ maxTries: 5 }),
        throttle: api.throttleOff(),
      }),
    }),
    "Write a short story about a robot learning to love:\n\n"
  );

  console.log(text);
}

main().catch(console.error);
