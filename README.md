# Hermes Search

A Deno project with OpenAI + Hermes MCP integration for advanced search capabilities.

## Features

- **Basic Deno Setup**: Standard Deno project with TypeScript support
- **Hermes MCP Integration**: Connect to Hermes search engine via Model Context Protocol
- **OpenAI Integration**: Use OpenAI models with MCP tools for intelligent search
- **Streaming Responses**: Real-time streaming of search results
- **Multi-Step Tool Calling**: Enable complex workflows with `maxSteps` support
- **Schema Definition**: Type-safe tool usage with Zod schema validation
- **AI SDK Best Practices**: Implements latest patterns from Vercel AI SDK
- **Graceful Error Handling**: Automatic fallback when MCP server is unavailable

## Getting Started

Make sure you have [Deno](https://deno.land/) installed.

### Environment Setup

Create a `.env` file in the project root with your credentials:

```bash
# Required: Your OpenAI API key (get from https://platform.openai.com/api-keys)
# Use either OPENAI_API_KEY (standard) or OPENAI_ACCESS_TOKEN (legacy)
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Hermes MCP server URL (provided for demo purposes)
HERMES_MCP_URL=https://hermes-dataplor-e0ce1df86095.herokuapp.com
```

**Important Notes:**
- You need a valid OpenAI API key for the client to generate responses
- If the Hermes MCP server is unavailable, the client automatically switches to fallback mode
- In fallback mode, you get OpenAI responses without MCP search tools

### Running the project

```bash
# Run the main module
deno task start

# Run in development mode with file watching
deno task dev

# Run the Hermes MCP client
deno task hermes "Find the latest research on large language models"
```

### Using the Hermes Client

The Hermes client connects to the Hermes MCP server and uses OpenAI models to provide intelligent search capabilities:

```bash
# Search for research papers and academic content
deno task hermes "Find recent papers on transformer architecture improvements"

# Search for code repositories and documentation
deno task hermes "Search for TypeScript libraries for data visualization"

# Find specific technical solutions
deno task hermes "How to implement OAuth2 with refresh tokens in Node.js"

# Search for news and current events
deno task hermes "Latest developments in quantum computing breakthroughs"

# Find detailed explanations and tutorials
deno task hermes "Comprehensive guide to setting up Kubernetes clusters"
```

### Advanced Search Capabilities

Hermes search excels at finding comprehensive, up-to-date information across various domains:

```bash
# Academic and Research
deno task hermes "Latest breakthroughs in CRISPR gene editing technology"
deno task hermes "Meta-analysis of machine learning bias mitigation techniques"

# Software Development
deno task hermes "Best practices for microservices architecture with event sourcing"
deno task hermes "Performance comparison of Rust vs Go for concurrent web servers"

# Business and Market Intelligence
deno task hermes "Emerging trends in renewable energy storage solutions"
deno task hermes "Market analysis of electric vehicle adoption in Europe 2024"

# Technical Documentation
deno task hermes "Complete guide to implementing zero-trust security architecture"
deno task hermes "Advanced PostgreSQL performance tuning strategies"
```

### Testing

```bash
# Run tests (when test files are created)
deno task test
```

### Code Quality

```bash
# Format code
deno task fmt

# Lint code
deno task lint
```

## API Reference

### HermesClient Methods

#### `connect(): Promise<void>`
Establishes connection to the Hermes MCP server. Automatically switches to fallback mode if the server is unavailable.

#### `disconnect(): Promise<void>`
Closes the MCP client connection and cleans up resources.

#### `search(query: string): Promise<string>`
Performs a search using the **Schema Discovery** approach. Automatically discovers all available tools from the MCP server and uses them with multi-step calling.

#### `searchWithStreaming(query: string): Promise<void>`
Same as `search()` but streams the response in real-time to the console. Includes proper MCP client closure in the `onFinish` callback as per AI SDK best practices.

#### `searchWithTypedTools(query: string): Promise<string>`
Uses the **Schema Definition** approach for better type safety. Explicitly defines tool schemas using Zod for compile-time type checking and IDE autocompletion.

#### `listAvailableTools(): Promise<void>`
Lists all tools available from the MCP server. Shows "fallback mode" message when MCP server is unavailable.

### AI SDK Features Implemented

- **Multi-Step Tool Calling**: All search methods use `maxSteps: 5` to enable complex tool workflows
- **Step Callbacks**: `onStepFinish` logging for debugging tool execution
- **Proper Resource Management**: MCP client closure in `onFinish` callbacks for streaming
- **Schema Definition**: Type-safe tool usage with Zod schemas (in `searchWithTypedTools`)
- **Schema Discovery**: Automatic tool discovery (in `search` and `searchWithStreaming`)

## Project Structure

- `hermes-client.ts` - Main Hermes MCP client implementation and CLI interface
- `hermes-example.ts` - Example usage patterns for the Hermes client
- `deno.json` - Deno configuration file with tasks and dependencies
- `deno.lock` - Dependency lock file for reproducible builds
- `README.md` - Project documentation

## Available Tasks

- `dev` - Run with file watching and required permissions
- `start` - Run the main module
- `hermes` - Run the Hermes MCP client with a search query
- `test` - Run all tests
- `fmt` - Format code using Deno's formatter
- `lint` - Lint code using Deno's linter

## Architecture

### Hermes MCP Integration

The project uses the Model Context Protocol (MCP) to connect with the Hermes search engine:

1. **MCP Client**: Uses Vercel AI SDK's experimental MCP client
2. **Transport**: Server-Sent Events (SSE) transport for real-time communication
3. **OpenAI Integration**: Combines MCP tools with OpenAI models for intelligent responses
4. **Streaming**: Real-time response streaming for better user experience

### Key Components

- **HermesClient**: Main class that manages MCP connection and OpenAI integration
- **Tool Discovery**: Automatically discovers available tools from the MCP server
- **Error Handling**: Comprehensive error handling for connection and API issues
- **Environment Management**: Secure handling of API keys and server URLs

## Dependencies

- **AI SDK**: Vercel's AI SDK for MCP and OpenAI integration
- **OpenAI Provider**: Official OpenAI provider for the AI SDK
- **Deno Standard Library**: For environment variables and utilities

## Development

### Adding New Features

1. Extend the `HermesClient` class in `hermes-client.ts`
2. Add new methods for specific search capabilities
3. Create test files following Deno testing conventions
4. Update this README with new functionality

### Error Handling

The client includes comprehensive error handling for:
- MCP server connection issues
- OpenAI API errors
- Environment variable validation
- Tool execution failures

### Performance Considerations

- Tools are cached when possible for better performance
- Streaming responses provide immediate feedback
- Connection pooling for MCP server communication
- Proper resource cleanup on disconnect 