import { load } from "@std/dotenv";
import {
  experimental_createMCPClient as createMCPClient,
  generateText,
  type LanguageModel,
  streamText,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Hermes Response Schemas
export const AgenticAISearchResponseSchema = z.object({
  object: z.literal("ai_search"),
  query: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  message: z.string(),
  error: z.boolean().optional(),
});

export type AgenticAISearchResponse = z.infer<
  typeof AgenticAISearchResponseSchema
>;

export const AreaSchema = z.object({
  uuid: z.string(),
  object: z.literal("area"),
  primary_name: z.string(),
  region: z.string(),
  bbox_xmin: z.number(),
  bbox_xmax: z.number(),
  bbox_ymin: z.number(),
  bbox_ymax: z.number(),
  zip_code: z.string().optional(),
});

export const BrandSchema = z.object({
  key: z.string(),
  name: z.string(),
  object: z.literal("brand").optional(),
  website: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  is_chain: z.boolean().optional(),
  estimated_count: z.number().nullable().optional(),
  estimated_counts_by_country: z.record(z.number()).nullable().optional(),
  business_category_ids: z.array(z.string()).optional(),
  wikipedia: z.string().optional(),
});

export const BusinessCategorySchema = z.object({
  key: z.string(),
  en: z.string(),
  object: z.literal("business_category").optional(),
  path: z.string().optional(),
  coordinates: z.string().optional(),
});

export const LegacyAISearchResponseSchema = z.object({
  object: z.literal("ai_search"),
  areas: z.array(AreaSchema),
  geographies: z.array(AreaSchema),
  brands: z.array(BrandSchema),
  business_categories: z.array(BusinessCategorySchema),
});

export type LegacyAISearchResponse = z.infer<
  typeof LegacyAISearchResponseSchema
>;

export const AISearchErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type AISearchErrorResponse = z.infer<typeof AISearchErrorResponseSchema>;

export const AISearchResponseSchema = z.union([
  AgenticAISearchResponseSchema,
  LegacyAISearchResponseSchema,
  AISearchErrorResponseSchema,
]);

export type AISearchResponse = z.infer<typeof AISearchResponseSchema>;

const env = await load();

if (!env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY or OPENAI_ACCESS_TOKEN environment variable is required"
  );
}

if (!env.HERMES_MCP_URL) {
  throw new Error("HERMES_MCP_URL environment variable is required");
}

const { OPENAI_API_KEY, HERMES_MCP_URL } = env;

const encoder = new TextEncoder();

export class HermesClient {
  private mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  private model: LanguageModel;

  constructor() {
    const openai = createOpenAI({
      apiKey: OPENAI_API_KEY,
    });
    this.model = openai("gpt-4o-mini");
  }

  async connect(): Promise<void> {
    try {
      console.log(
        `🔗 Attempting to connect to Hermes MCP server (Streamable HTTP) at: ${HERMES_MCP_URL}`
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(HERMES_MCP_URL)
      );

      this.mcpClient = await createMCPClient({
        transport,
      });
      console.log("✅ Connected to Hermes MCP server via Streamable HTTP");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to connect to Hermes MCP server:", errorMessage);
      throw new Error(
        `Failed to connect to Hermes MCP server: ${errorMessage}`
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.mcpClient) {
        await this.mcpClient.close();
        this.mcpClient = null;
        console.log("✅ Disconnected from Hermes MCP server");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from Hermes MCP server:", error);
    }
  }

  async search(query: string): Promise<string> {
    try {
      if (!this.mcpClient) {
        throw new Error("MCP client not connected. Call connect() first.");
      }

      const tools = await this.mcpClient.tools();
      const systemMessage =
        "You are a helpful search assistant powered by the Hermes search engine. Use the available MCP tools when possible to search for information and provide comprehensive answers.";

      const result = await generateText({
        model: this.model,
        tools,
        maxSteps: 5, // Enable multi-step tool calling as per AI SDK docs
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: query,
          },
        ],
        onStepFinish({ toolCalls }) {
          // Log tool execution steps for debugging
          if (toolCalls && toolCalls.length > 0) {
            console.log(`🔧 Executed ${toolCalls.length} tool call(s)`);
          }
        },
      });

      return result.text || "No response received";
    } catch (error) {
      console.error("❌ Search failed:", error);
      throw error;
    }
  }

  async searchWithStreaming(query: string): Promise<void> {
    try {
      console.log(`🔍 Searching: "${query}"`);

      if (!this.mcpClient) {
        throw new Error("MCP client not connected. Call connect() first.");
      }

      console.log("📡 Streaming response with MCP tools...\n");

      const tools = await this.mcpClient.tools();
      const systemMessage =
        "You are a helpful search assistant powered by the Hermes search engine. Use the available MCP tools when possible to search for information and provide comprehensive answers.";

      const result = streamText({
        model: this.model,
        tools,
        maxSteps: 5, // Enable multi-step tool calling as per AI SDK docs
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: query,
          },
        ],
        onStepFinish({ toolCalls }) {
          // Log tool execution steps for debugging
          if (toolCalls && toolCalls.length > 0) {
            console.log(`\n🔧 Executed ${toolCalls.length} tool call(s)`);
          }
        },
        onFinish: async () => {
          // Close MCP client when streaming finishes (best practice from AI SDK docs)
          if (this.mcpClient) {
            await this.mcpClient.close();
            this.mcpClient = null;
          }
        },
      });

      // Stream the response
      for await (const delta of result.textStream) {
        await Deno.stdout.write(encoder.encode(delta));
      }

      await result.text; // Ensure streaming completes
      console.log(`\n\n✅ Search completed successfully`);
    } catch (error) {
      console.error("❌ Streaming search failed:", error);
      throw error;
    }
  }

  async listAvailableTools(): Promise<void> {
    try {
      if (!this.mcpClient) {
        console.log("⚠️  MCP client not connected. Call connect() first.");
        return;
      }

      const tools = await this.mcpClient.tools();
      const toolNames = Object.keys(tools);

      console.log("🛠️  Available MCP tools:");
      if (toolNames.length === 0) {
        console.log("   No tools available from the MCP server");
      } else {
        toolNames.forEach((name) => {
          console.log(`   - ${name}`);
        });
      }
    } catch (error) {
      console.error("❌ Failed to list tools:", error);
    }
  }

  async searchWithTypedTools(query: string): Promise<string> {
    try {
      if (!this.mcpClient) {
        throw new Error("MCP client not connected. Call connect() first.");
      }

      // Schema Definition approach for better type safety (as per AI SDK docs)
      const tools = await this.mcpClient.tools({
        schemas: {
          // Example schema - adapt based on actual Hermes MCP tools
          search: {
            parameters: z.object({
              query: z.string().describe("The search query"),
              limit: z
                .number()
                .optional()
                .describe("Maximum number of results"),
            }),
          },
          // Add more tool schemas as needed based on Hermes MCP server capabilities
        },
      });

      const result = await generateText({
        model: this.model,
        tools,
        maxSteps: 5,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful search assistant powered by the Hermes search engine. Use the available MCP tools with proper type safety to search for information and provide comprehensive answers.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        onStepFinish({ toolCalls }) {
          if (toolCalls && toolCalls.length > 0) {
            console.log(`🔧 Executed ${toolCalls.length} typed tool call(s)`);
          }
        },
      });

      return result.text || "No response received";
    } catch (error) {
      console.error("❌ Typed search failed:", error);
      throw error;
    }
  }

  async searchWithStructuredOutput<T extends z.ZodType>(
    query: string,
    responseSchema: T,
    options?: {
      latitude?: number;
      longitude?: number;
      useLegacyFormat?: boolean;
    }
  ): Promise<z.infer<T>> {
    try {
      if (!this.mcpClient) {
        throw new Error("MCP client not connected. Call connect() first.");
      }

      const tools = await this.mcpClient.tools();

      const {
        latitude: _latitude,
        longitude: _longitude,
        useLegacyFormat: _useLegacyFormat = false,
      } = options || {};

      const systemMessage = `You are a helpful search assistant powered by the Hermes search engine. Use the available MCP tools when possible to search for information and provide comprehensive answers. 

IMPORTANT: You must respond with valid JSON only (no markdown formatting, no code blocks). The response must exactly match the required schema structure. If no data is found, return empty arrays for the required fields rather than error messages.

Example valid response format:
{
  "areas": [],
  "geographies": [],
  "brands": [],
  "business_categories": [],
  "object": "ai_search"
}`;

      const result = await generateText({
        model: this.model,
        tools,
        maxSteps: 5,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: `${query}\n\nYou must respond with a JSON object that exactly matches this schema:\n${responseSchema.toString()}`,
          },
        ],
        onStepFinish({ toolCalls }) {
          if (toolCalls && toolCalls.length > 0) {
            console.log(`🔧 Executed ${toolCalls.length} tool call(s)`);
          }
        },
      });

      const responseText = result.text || "{}";

      try {
        // Handle responses wrapped in markdown code blocks
        let jsonText = responseText.trim();

        // Remove markdown code block wrappers if present
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsed = JSON.parse(jsonText);
        return responseSchema.parse(parsed);
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
    } catch (error) {
      console.error("❌ Structured search failed:", error);
      throw error;
    }
  }

  async searchWithAgenticFormat(
    query: string,
    options?: {
      latitude?: number;
      longitude?: number;
    }
  ): Promise<AgenticAISearchResponse> {
    return await this.searchWithStructuredOutput(
      query,
      AgenticAISearchResponseSchema,
      options
    );
  }

  async searchWithLegacyFormat(
    query: string,
    options?: {
      latitude?: number;
      longitude?: number;
    }
  ): Promise<LegacyAISearchResponse> {
    return await this.searchWithStructuredOutput(
      query,
      LegacyAISearchResponseSchema,
      { ...options, useLegacyFormat: true }
    );
  }

  async searchWithCustomSchema<T extends z.ZodType>(
    query: string,
    schema: T,
    options?: {
      latitude?: number;
      longitude?: number;
    }
  ): Promise<z.infer<T>> {
    return await this.searchWithStructuredOutput(query, schema, options);
  }
}

async function main(): Promise<void> {
  const client = new HermesClient();

  try {
    await client.connect();
    await client.listAvailableTools();

    const args = Deno.args;

    if (args.length === 0) {
      console.log("\n📝 Usage examples:");
      console.log("  deno task hermes 'What is TypeScript?'");
      console.log("  deno task hermes 'Search for Deno tutorials'");
      console.log(
        "  deno run --allow-net --allow-read --allow-env hermes-client.ts 'your query'"
      );
      console.log(
        "\n💡 Tip: Set your OPENAI_API_KEY in .env to use OpenAI features"
      );
      return;
    }

    const query = args.join(" ");

    // Use streaming for better user experience
    await client.searchWithStreaming(query);
  } catch (error) {
    console.error("❌ Application error:", error);
    Deno.exit(1);
  } finally {
    await client.disconnect();
  }
}

if (import.meta.main) {
  main();
}
