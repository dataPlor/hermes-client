import { load } from "@std/dotenv";
import {
  experimental_createMCPClient as createMCPClient,
  generateText,
  streamText,
  type LanguageModel,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
  private fallbackMode = false;

  constructor() {
    const openai = createOpenAI({
      apiKey: OPENAI_API_KEY,
    });
    this.model = openai("gpt-4o-mini");
  }

  async connect(): Promise<void> {
    try {
      if (!HERMES_MCP_URL) {
        throw new Error("HERMES_MCP_URL is not configured");
      }

      // Hermes MCP server requires the /mcp endpoint
      const mcpUrl = HERMES_MCP_URL.endsWith("/mcp")
        ? HERMES_MCP_URL
        : `${HERMES_MCP_URL}/mcp`;

      console.log(
        `🔗 Attempting to connect to Hermes MCP server (Streamable HTTP) at: ${mcpUrl}`
      );

      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));

      this.mcpClient = await createMCPClient({
        transport,
      });
      console.log("✅ Connected to Hermes MCP server via Streamable HTTP");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn("⚠️  Failed to connect to Hermes MCP server:", errorMessage);
      console.log("🔄 Switching to fallback mode (OpenAI only, no MCP tools)");
      this.fallbackMode = true;
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
      let tools = {};

      if (!this.fallbackMode && this.mcpClient) {
        tools = await this.mcpClient.tools();
      }

      const systemMessage = this.fallbackMode
        ? "You are a helpful assistant. Answer questions using your knowledge base."
        : "You are a helpful search assistant powered by the Hermes search engine. Use the available MCP tools when possible to search for information and provide comprehensive answers.";

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

      if (this.fallbackMode) {
        console.log(
          "📡 Streaming response (fallback mode - no MCP tools)...\n"
        );
      } else {
        console.log("📡 Streaming response with MCP tools...\n");
      }

      let tools = {};

      if (!this.fallbackMode && this.mcpClient) {
        tools = await this.mcpClient.tools();
      }

      const systemMessage = this.fallbackMode
        ? "You are a helpful assistant. Answer questions using your knowledge base."
        : "You are a helpful search assistant powered by the Hermes search engine. Use the available MCP tools when possible to search for information and provide comprehensive answers.";

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
          if (!this.fallbackMode && this.mcpClient) {
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
      if (this.fallbackMode) {
        console.log("🛠️  Running in fallback mode - no MCP tools available");
        console.log(
          "   The Hermes MCP server is not accessible, using OpenAI knowledge base only"
        );
        return;
      }

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
      if (this.fallbackMode || !this.mcpClient) {
        // Fall back to regular search without MCP tools
        return await this.search(query);
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
      // Fall back to regular search
      return await this.search(query);
    }
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
