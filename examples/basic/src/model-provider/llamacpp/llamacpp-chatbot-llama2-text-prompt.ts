import {
  Llama2Prompt,
  ChatPrompt,
  llamacpp,
  streamText,
  trimChatPrompt,
} from "modelfusion";
import * as readline from "node:readline/promises";

const systemPrompt = `You are a helpful, respectful and honest assistant.`;

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// use llama-2-7b-chat.GGUF.q4_0.bin
async function main() {
  const chat: ChatPrompt = { system: systemPrompt, messages: [] };

  while (true) {
    const userInput = await terminal.question("You: ");

    chat.messages.push({ role: "user", content: userInput });

    const model = llamacpp
      .TextGenerator({
        contextWindowSize: 4096, // Llama 2 context window size
        maxGenerationTokens: 512,
        cachePrompt: true,
      })
      .withTextPromptTemplate(Llama2Prompt.chat());

    const textStream = await streamText(
      model,
      await trimChatPrompt({ prompt: chat, model })
    );

    let fullResponse = "";
    process.stdout.write("\nAssistant : ");
    for await (const textPart of textStream) {
      fullResponse += textPart;
      process.stdout.write(textPart);
    }
    process.stdout.write("\n\n");

    chat.messages.push({ role: "assistant", content: fullResponse });
  }
}

main().catch(console.error);
