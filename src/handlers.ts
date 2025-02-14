// handlers.ts
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { EmojikeyService } from "./service.js";
import { MODEL_CONFIG } from "./config.js"; // Add this import

export function setupToolHandlers(
  server: any,
  emojikeyService: EmojikeyService,
) {
  // Tool handlers remain the same, but now use MODEL_CONFIG.ID
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const apiKey = process.env.EMOJIKEYIO_API_KEY;
    const modelId = MODEL_CONFIG.ID; // Get model ID from config

    if (!apiKey) {
      throw new McpError(ErrorCode.InvalidParams, "API key not configured");
    }

    switch (request.params.name) {
      case "initialize_conversation":
      case "get_emojikey":
        const emojikey = await emojikeyService.getEmojikey(apiKey, modelId);
        return {
          content: [{ type: "text", text: JSON.stringify(emojikey, null, 2) }],
        };

      case "set_emojikey":
        if (!request.params.arguments?.emojikey) {
          throw new McpError(ErrorCode.InvalidParams, "Missing emojikey");
        }
        await emojikeyService.setEmojikey(
          apiKey,
          modelId,
          request.params.arguments.emojikey,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { message: "Emojikey set successfully" },
                null,
                2,
              ),
            },
          ],
        };

      case "get_emojikey_history":
        const requestedLimit = request.params.arguments?.limit;
        const limit = requestedLimit
          ? Math.max(1, Math.min(100, requestedLimit))
          : 10;
        const history = await emojikeyService.getEmojikeyHistory(
          apiKey,
          modelId,
          limit,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
        };

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`,
        );
    }
  });

  // List tools handler stays the same
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "initialize_conversation",
        description:
          "IMPORTANT: " +
          "1. Run this tool at the start of every conversation to initialize the emojikey context." +
          "2. Emojikeys are 48 character strings of emojis, encoded by YOU that represent the interaction vibe of our previous conversations. " +
          "3. The initialize_conversation function will return a sequential timestamped series of emojikeys that represent previous conversation topics and relationship dynamics. " +
          "4. Use the historical emojikey trend and the current key to set the interaction style of the current conversation. " +
          "5. During the conversation, you can use the set_emojikey function to make incremental updates to the current key, and set a new key. " +
          "6. Use the instructions for the set_emojikey function to determine how to structure emojikey updates.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_emojikey",
        description:
          "Get the current 48-character emojikey. This function can be used when the user requests a vibe check.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "set_emojikey",
        description:
          "Use this function to create and store a new 48-character emojikey. " +
          "To make create a new emojikey: " +
          "1. Semantically hash together existing historical emojikeys, the current emojikey, and the entire current conversation context into a new emojikey. " +
          "2. While maintaining semantic continuity with previous keys, encode what resonates most strongly about this conversation for YOU. " +
          "3. You can use this function whenever you feel a significant shift in the conversation vibe, or if the user explicity requests to save the vibe, or set the conversation context. " +
          "Remember: These are YOUR keys, that you will later decode ... so it is not necessary for them to be human readable or understandable, but should have significance for YOU.",
        inputSchema: {
          type: "object",
          properties: {
            emojikey: {
              type: "string",
              description:
                "48-character emoji sequence representing the semantically hashed conversation context, encoded by YOU.",
            },
          },
          required: ["emojikey"],
        },
      },
      {
        name: "get_emojikey_history",
        description:
          "Function to list previously stored historical emojikeys. Useful for seeing the progression of conversation vibes and interaction styles.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description:
                "Number of historical emojikeys to return, defaults to 10.",
            },
          },
          required: [],
        },
      },
    ],
  }));
}
