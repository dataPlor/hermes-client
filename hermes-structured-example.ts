import {
  HermesClient,
  AgenticAISearchResponseSchema,
  LegacyAISearchResponseSchema,
} from "./hermes-client.ts";
import { z } from "zod";

async function runStructuredExamples(): Promise<void> {
  const client = new HermesClient();

  try {
    await client.connect();

    console.log("🚀 Running Hermes Structured Output Examples\n");

    // Example 1: Agentic Format (Current implementation)
    console.log("📍 Example 1: Agentic Format Response");
    try {
      const agenticResult = await client.searchWithAgenticFormat(
        "Find coffee shops in San Francisco",
        { latitude: 37.7749, longitude: -122.4194 }
      );
      console.log("Agentic Response:", JSON.stringify(agenticResult, null, 2));
    } catch (error) {
      console.error("Agentic format failed:", error);
    }
    console.log("\n" + "=".repeat(50) + "\n");

    // Example 2: Legacy Format (Structured data approach)
    console.log("📍 Example 2: Legacy Format Response");
    try {
      const legacyResult = await client.searchWithLegacyFormat(
        "Show me brands and business categories for restaurants"
      );
      console.log("Legacy Response:", JSON.stringify(legacyResult, null, 2));
    } catch (error) {
      console.error("Legacy format failed:", error);
    }
    console.log("\n" + "=".repeat(50) + "\n");

    // Example 3: Custom Schema
    console.log("📍 Example 3: Custom Schema Response");
    const CustomResponseSchema = z.object({
      object: z.literal("custom_search"),
      query: z.string(),
      results: z.array(
        z.object({
          name: z.string(),
          type: z.enum(["brand", "category", "area"]),
          confidence: z.number().min(0).max(1),
        })
      ),
      metadata: z.object({
        total_results: z.number(),
        search_time_ms: z.number(),
      }),
    });

    try {
      const customResult = await client.searchWithCustomSchema(
        "Find technology companies and their business categories",
        CustomResponseSchema
      );
      console.log("Custom Response:", JSON.stringify(customResult, null, 2));
    } catch (error) {
      console.error("Custom schema failed:", error);
    }
    console.log("\n" + "=".repeat(50) + "\n");

    // Example 4: Error Handling
    console.log("📍 Example 4: Error Response Handling");
    const ErrorSchema = z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.any()).optional(),
      }),
    });

    try {
      const errorResult = await client.searchWithCustomSchema(
        "This query should trigger an error response",
        ErrorSchema
      );
      console.log("Error Response:", JSON.stringify(errorResult, null, 2));
    } catch (error) {
      console.error("Error handling failed:", error);
    }
  } catch (error) {
    console.error("❌ Structured examples failed:", error);
  } finally {
    await client.disconnect();
  }
}

if (import.meta.main) {
  runStructuredExamples();
}
