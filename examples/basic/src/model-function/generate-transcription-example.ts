import dotenv from "dotenv";
import { generateTranscription, openai } from "modelfusion";
import fs from "node:fs";

dotenv.config();

async function main() {
  const data = await fs.promises.readFile("data/test.mp3");

  const transcription = await generateTranscription(
    openai.Transcriber({ model: "whisper-1" }),
    { type: "mp3", data }
  );

  console.log(transcription);
}

main().catch(console.error);
