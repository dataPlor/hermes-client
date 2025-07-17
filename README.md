# Hermes Search

A basic Deno project.

## Getting Started

Make sure you have [Deno](https://deno.land/) installed.

### Running the project

```bash
# Run the main module
deno task start

# Run in development mode with file watching
deno task dev
```

### Testing

```bash
# Run tests
deno task test
```

### Code Quality

```bash
# Format code
deno task fmt

# Lint code
deno task lint
```

## Project Structure

- `mod.ts` - Main module with exported functions
- `mod_test.ts` - Tests for the main module
- `deno.json` - Deno configuration file

## Available Tasks

- `dev` - Run with file watching and required permissions
- `start` - Run the main module
- `test` - Run all tests
- `fmt` - Format code using Deno's formatter
- `lint` - Lint code using Deno's linter 