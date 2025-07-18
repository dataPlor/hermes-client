import { HermesClient, LegacyAISearchResponseSchema } from "./hermes-client.ts";
import { z } from "zod";

const QuerySchema = z.object({
  q: z.string().min(1, "'q' value cannot be blank"),
});

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/atlas/v1/ai_searches" && req.method === "GET") {
    try {
      const query = url.searchParams.get("q");

      if (!query) {
        return new Response(
          JSON.stringify({
            error: {
              code: "invalid_params",
              message: "'q' value cannot be blank",
            },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const validationResult = QuerySchema.safeParse({ q: query });
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({
            error: {
              code: "invalid_params",
              message:
                validationResult.error.errors[0]?.message ||
                "Invalid query parameter",
            },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const client = new HermesClient();
      await client.connect();

      try {
        const result = await client.searchWithCustomSchema(
          query,
          LegacyAISearchResponseSchema
        );

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (searchError) {
        console.warn("Search failed, returning empty results:", searchError);

        // Return empty results instead of 500 error when MCP tools fail
        const emptyResult = {
          object: "ai_search",
          areas: [],
          geographies: [],
          brands: [],
          business_categories: [],
        };

        return new Response(JSON.stringify(emptyResult), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } finally {
        await client.disconnect();
      }
    } catch (error) {
      console.error("AI search error:", error);

      return new Response(
        JSON.stringify({
          error: {
            code: "internal_error",
            message: "An internal error occurred while processing the search",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response("Not Found", { status: 404 });
}

const port = 8000;
console.log(`🚀 Server running on http://localhost:${port}`);

// Use Deno's built-in serve function
const server = Deno.serve({ port }, handler);
await server.finished;
