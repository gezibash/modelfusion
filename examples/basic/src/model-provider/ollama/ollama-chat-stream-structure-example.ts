import dotenv from "dotenv";
import {
  jsonStructurePrompt,
  ollama,
  streamStructure,
  zodSchema,
} from "modelfusion";
import { z } from "zod";

dotenv.config();

async function main() {
  const structureStream = await streamStructure(
    ollama
      .ChatTextGenerator({
        model: "openhermes2.5-mistral",
        maxGenerationTokens: 1024,
        temperature: 0,
      })
      .asStructureGenerationModel(jsonStructurePrompt.text()),

    zodSchema(
      z.object({
        characters: z.array(
          z.object({
            name: z.string(),
            class: z
              .string()
              .describe("Character class, e.g. warrior, mage, or thief."),
            description: z.string(),
          })
        ),
      })
    ),

    "Generate 3 character descriptions for a fantasy role playing game. "
  );

  for await (const part of structureStream) {
    if (part.isComplete) {
      const fullyTypedStructure = part.value;
      console.log("final value", fullyTypedStructure);
    } else {
      const unknownPartialStructure = part.value;
      console.log("partial value", unknownPartialStructure);
    }
  }
}

main().catch(console.error);
