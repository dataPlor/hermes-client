import { HermesClient } from "./hermes-client.ts";

async function runExamples(): Promise<void> {
  const client = new HermesClient();

  try {
    await client.connect();

    console.log("🚀 Running Hermes MCP Client Examples\n");

    // Example 1: Hello Tool Demonstration
    console.log("📍 Example 1: Hello Tool Demo");
    const result1 = await client.search(
      "Use the hello tool to greet me and tell me about yourself"
    );
    console.log("Result:", result1);
    console.log("\n" + "=".repeat(50) + "\n");

    // Example 2: Brand Discovery (Streaming)
    console.log("📍 Example 2: Brand Discovery (Streaming)");
    await client.searchWithStreaming(
      "Use the listBrands tool to show me a list of brands. Find brands for me."
    );
    console.log("\n" + "=".repeat(50) + "\n");

    // Example 3: Business Categories Discovery
    console.log("📍 Example 3: Business Categories Discovery");
    await client.searchWithStreaming(
      "Use the listBusinessCategories tool to show me all available business categories."
    );
    console.log("\n" + "=".repeat(50) + "\n");

    // Example 4: Combined MCP Tools Query
    console.log("📍 Example 4: Combined MCP Tools Demo (Typed Tools)");
    const result4 = await client.searchWithTypedTools(
      "First use the hello tool to greet me, then use listBusinessCategories to show business categories, and finally use listBrands to show me some brands. Use all three Hermes tools."
    );
    console.log("Result:", result4);
    console.log("\n" + "=".repeat(50) + "\n");
  } catch (error) {
    console.error("❌ Example failed:", error);
  } finally {
    await client.disconnect();
  }
}

if (import.meta.main) {
  runExamples();
}
