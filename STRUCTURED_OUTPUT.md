# Hermes Structured Output Guide

This guide explains how to enforce specific JSON response schemas when using the Hermes client.

## Overview

The Hermes client supports structured output using Zod schemas to ensure OpenAI responds with specific JSON shapes. This is useful for:

- API integrations requiring consistent response formats
- Type-safe data processing
- Enforcing business logic in responses
- Integration with existing systems

## Available Response Schemas

### 1. AgenticAISearchResponse (Current Implementation)

Used by `/atlas/v1/ai_searches` and `/atlas/v2/ai_searches`:

```typescript
{
  object: "ai_search",
  query: string,
  latitude?: number,
  longitude?: number,
  message: string,
  error?: boolean
}
```

### 2. LegacyAISearchResponse (Structured Data)

Legacy format with detailed structured data:

```typescript
{
  object: "ai_search",
  areas: Area[],
  geographies: Area[], // Alias for areas
  brands: Brand[],
  business_categories: BusinessCategory[]
}
```

### 3. AISearchErrorResponse

Error response format:

```typescript
{
  error: {
    code: string,
    message: string
  }
}
```

## Usage Methods

### Method 1: Predefined Formats

#### Agentic Format
```typescript
import { HermesClient } from "./hermes-client.ts";

const client = new HermesClient();
await client.connect();

const result = await client.searchWithAgenticFormat(
  "Find coffee shops in San Francisco",
  { latitude: 37.7749, longitude: -122.4194 }
);

console.log(result);
// {
//   object: "ai_search",
//   query: "Find coffee shops in San Francisco",
//   latitude: 37.7749,
//   longitude: -122.4194,
//   message: "Found 15 coffee shops in San Francisco...",
//   error: false
// }
```

#### Legacy Format
```typescript
const result = await client.searchWithLegacyFormat(
  "Show me restaurant brands and categories"
);

console.log(result);
// {
//   object: "ai_search",
//   areas: [...],
//   geographies: [...],
//   brands: [...],
//   business_categories: [...]
// }
```

### Method 2: Custom Schema

Define your own response schema:

```typescript
import { z } from "zod";

const CustomResponseSchema = z.object({
  object: z.literal("custom_search"),
  query: z.string(),
  results: z.array(z.object({
    name: z.string(),
    type: z.enum(["brand", "category", "area"]),
    confidence: z.number().min(0).max(1),
  })),
  metadata: z.object({
    total_results: z.number(),
    search_time_ms: z.number(),
  }),
});

const result = await client.searchWithCustomSchema(
  "Find technology companies",
  CustomResponseSchema
);
```

### Method 3: Generic Structured Output

For maximum flexibility:

```typescript
const result = await client.searchWithStructuredOutput(
  "Your query here",
  YourZodSchema,
  { latitude: 37.7749, longitude: -122.4194 }
);
```

## Error Handling

The client automatically validates responses against the provided schema:

```typescript
try {
  const result = await client.searchWithAgenticFormat(
    "Find coffee shops"
  );
  console.log("Success:", result);
} catch (error) {
  if (error.message.includes("Invalid JSON response")) {
    console.error("OpenAI didn't return valid JSON");
  } else if (error.message.includes("Zod validation failed")) {
    console.error("Response doesn't match expected schema");
  } else {
    console.error("Other error:", error);
  }
}
```

## System Message Customization

The client automatically includes schema enforcement in system messages:

```
"You are a helpful search assistant powered by the Hermes search engine. 
Use the available MCP tools when possible to search for information and 
provide comprehensive answers. You must respond with valid JSON that 
matches the provided schema."
```

## Examples

### Basic Usage
```bash
deno task hermes-structured
```

### Programmatic Usage
```typescript
import { HermesClient, AgenticAISearchResponseSchema } from "./hermes-client.ts";

const client = new HermesClient();
await client.connect();

// Use predefined format
const result = await client.searchWithAgenticFormat(
  "Find restaurants in New York",
  { latitude: 40.7128, longitude: -74.0060 }
);

// Use custom schema
const customResult = await client.searchWithCustomSchema(
  "Find tech startups",
  YourCustomSchema
);
```

## Best Practices

1. **Always handle errors**: Structured output can fail if OpenAI doesn't return valid JSON
2. **Use specific schemas**: Define schemas that match your exact needs
3. **Include fallbacks**: Consider fallback behavior when structured output fails
4. **Test thoroughly**: Validate that your schemas work with various query types
5. **Document schemas**: Keep your response schemas well-documented

## Integration with Existing APIs

To integrate with existing Hermes APIs:

```typescript
// For /atlas/v1/ai_searches and /atlas/v2/ai_searches
const response = await client.searchWithAgenticFormat(query, coords);

// For legacy structured data APIs
const response = await client.searchWithLegacyFormat(query);
```

## Type Safety

All methods return properly typed responses:

```typescript
const result: AgenticAISearchResponse = await client.searchWithAgenticFormat(query);
const legacyResult: LegacyAISearchResponse = await client.searchWithLegacyFormat(query);
const customResult: z.infer<typeof YourSchema> = await client.searchWithCustomSchema(query, YourSchema);
``` 