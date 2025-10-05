# Claude AI Agent Tutorial

A comprehensive guide to building AI agents using the Claude Agent SDK for TypeScript.

## Table of Contents

1. [What is an AI Agent?](#what-is-an-ai-agent)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Core Concepts](#core-concepts)
5. [Examples](#examples)
6. [Building Your First Agent](#building-your-first-agent)
7. [Advanced Topics](#advanced-topics)
8. [Best Practices](#best-practices)

---

## What is an AI Agent?

An **AI Agent** is an autonomous system powered by a large language model (like Claude) that can:
- Understand natural language instructions
- Break down complex tasks into steps
- Use tools to interact with external systems (APIs, files, databases)
- Make decisions and take actions
- Learn from feedback and iterate

Think of it as a smart assistant that can not only answer questions but also **do things** for you.

---

## Prerequisites

- **Node.js** 18+ installed
- **Anthropic API Key** (get one at [console.anthropic.com](https://console.anthropic.com))
- Basic knowledge of TypeScript
- Familiarity with async/await and promises

---

## Installation

### 1. Clone or download this tutorial

```bash
cd claude-agent-tutorial
```

### 2. Install dependencies

```bash
npm install
```

This includes TypeScript, tsx (for running TypeScript files), and all necessary dependencies.

### 3. Set up your API key

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## Core Concepts

### 1. **The `query()` Function**

The main entry point for creating an agent. It takes a prompt and options:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const response = query({
  prompt: "Your instruction here",
  options: {
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are a helpful assistant',
    allowedTools: ['Read', 'Write'],
    maxTurns: 10
  }
});
```

**Key options:**
- `model`: Which Claude model to use
- `systemPrompt`: Sets the agent's role and behavior
- `allowedTools`: Which tools the agent can use
- `maxTurns`: Limits how many back-and-forth exchanges
- `permissionMode`: Controls tool execution permissions

### 2. **Tools**

Tools are functions that agents can call. There are two types:

#### Built-in Tools
- `Read`: Read files
- `Write`: Create/update files
- `Edit`: Make precise file edits
- `Grep`: Search file contents
- `Glob`: Find files by pattern
- `Bash`: Execute shell commands
- `WebSearch`: Search the web
- `WebFetch`: Fetch web content

#### Custom Tools
You define them using the `tool()` function:

```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myTool = tool(
  'tool_name',           // Tool identifier
  'Tool description',    // What it does
  z.object({            // Input schema (using Zod)
    param1: z.string(),
    param2: z.number()
  }),
  async (args: { param1: string; param2: number }) => {     // Implementation
    // Your code here
    return {
      content: [{
        type: 'text',
        text: 'Result'
      }]
    };
  }
);
```

### 3. **Message Streaming**

The `query()` function returns an async iterator that streams messages:

```typescript
for await (const message of response) {
  switch (message.type) {
    case 'assistant':
      // AI's text response
      console.log(message.message.content);
      break;

    case 'tool_use':
      // Agent is calling a tool
      console.log('Using:', message.tool_name);
      break;

    case 'tool_result':
      // Tool execution completed
      break;

    case 'result':
      // Final metadata
      console.log('Cost:', message.total_cost_usd);
      break;
  }
}
```

### 4. **Permission Modes**

Controls how the agent executes tools:

- `'default'`: Asks user before each tool use (interactive)
- `'acceptEdits'`: Auto-approves file edits, asks for others
- `'bypassPermissions'`: Executes all tools without asking
- `'plan'`: Creates execution plan without running tools

### 5. **Hooks**

Intercept tool execution to add logging, validation, or custom behavior:

```typescript
hooks: {
  PreToolUse: [async (input) => {
    console.log('About to use:', input.tool_name);
    return { continue: true, decision: 'approve' as const };
  }],

  PostToolUse: [async (input) => {
    console.log('Completed:', input.tool_name);
    return { continue: true };
  }]
}
```

---

## Examples

This tutorial includes 5 progressively complex examples:

### Example 1: Basic Agent
**File:** `examples/01-basic-agent.ts`

Learn the absolute basics - creating a simple query and handling responses.

```bash
npm run example1
```

**What you'll learn:**
- How to import the SDK
- Basic query structure
- Handling streaming responses
- Reading assistant messages

---

### Example 2: Custom Tools
**File:** `examples/02-custom-tools.ts`

Build custom tools for insurance premium calculation.

```bash
npm run example2
```

**What you'll learn:**
- Creating tools with `tool()`
- Defining input schemas with Zod
- Tool implementation
- How agents decide when to use tools
- Handling tool results

---

### Example 3: File Analyzer
**File:** `examples/03-file-analyzer.ts`

Use built-in tools to analyze code files.

```bash
npm run example3
```

**What you'll learn:**
- Using built-in tools (Read, Grep, Glob)
- File system interactions
- Permission handling
- Multi-step file analysis workflows

---

### Example 4: Code Reviewer
**File:** `examples/04-code-reviewer.ts`

Advanced agent with hooks for security code review.

```bash
npm run example4
```

**What you'll learn:**
- Pre/Post tool use hooks
- Permission modes
- Tool usage monitoring
- Writing analysis reports

---

## Building Your First Agent

Let's walk through building a simple agent step by step:

### Step 1: Import the SDK

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
```

### Step 2: Define any custom tools (optional)

```typescript
const weatherTool = tool(
  'get_weather',
  'Get current weather for a city',
  z.object({
    city: z.string().describe('City name')
  }),
  async (args: { city: string }) => {
    // Simulate API call
    const temp = Math.floor(Math.random() * 30) + 10;
    return {
      content: [{
        type: 'text',
        text: `Temperature in ${args.city}: ${temp}°C`
      }]
    };
  }
);
```

### Step 3: Create the query

```typescript
async function runAgent(): Promise<void> {
  const response = query({
    prompt: "What's the weather like in San Francisco?",
    options: {
      model: 'claude-3-5-sonnet-20241022',
      allowedTools: [weatherTool],
      maxTurns: 5
    }
  });

  // Handle responses
  for await (const message of response) {
    if (message.type === 'assistant') {
      console.log('Agent:', message.message.content);
    }
  }
}

runAgent();
```

### Step 4: Run it!

```bash
npx tsx your-agent.ts
```

---

## Advanced Topics

### Multi-Turn Conversations

Agents can have back-and-forth exchanges. Control this with `maxTurns`:

```typescript
options: {
  maxTurns: 10  // Allow up to 10 exchanges
}
```

### Error Handling

Always wrap your agent calls in try-catch:

```typescript
try {
  const response = query({ /* ... */ });
  for await (const message of response) {
    // Handle messages
  }
} catch (error) {
  console.error('Agent error:', (error as Error).message);
}
```

### Tool Composition

Agents can use multiple tools in sequence:

```typescript
allowedTools: [
  'Read',           // Read a file
  analysisTool,     // Analyze content
  'Write'           // Write results
]
```

The agent will automatically determine the order to use tools based on your prompt.

### State Management

Tools can share state through closures:

```typescript
let sessionData: Record<string, any> = {};

const saveTool = tool('save', '...', schema, async (args: { key: string; value: any }) => {
  sessionData[args.key] = args.value;
  return { content: [{ type: 'text', text: 'Saved!' }] };
});

const loadTool = tool('load', '...', schema, async (args: { key: string }) => {
  const value = sessionData[args.key];
  return { content: [{ type: 'text', text: value || 'Not found' }] };
});
```

---

## Best Practices

### 1. **Write Clear Prompts**

✅ Good:
```typescript
prompt: `Analyze the TypeScript files in ./src directory.
         Look for:
         1. Security vulnerabilities
         2. Code style issues
         3. Missing error handling

         Write a report to analysis-report.md`
```

❌ Bad:
```typescript
prompt: "check the code"
```

### 2. **Use Descriptive Tool Names and Descriptions**

The agent uses these to decide when to call tools:

```typescript
tool(
  'calculate_insurance_premium',  // Clear name
  'Calculate auto insurance premium based on driver age, vehicle value, and accident history',  // Detailed description
  // ...
)
```

### 3. **Define Clear Input Schemas**

Use Zod descriptions to guide the agent:

```typescript
z.object({
  age: z.number()
    .min(16)
    .max(100)
    .describe('Driver age in years, must be 16 or older'),
  state: z.string()
    .length(2)
    .describe('Two-letter state code, e.g., CA, TX, NY')
})
```

### 4. **Set Appropriate maxTurns**

- Simple queries: `maxTurns: 1-3`
- File analysis: `maxTurns: 5-10`
- Complex workflows: `maxTurns: 10-20`

### 5. **Use System Prompts to Set Role and Behavior**

```typescript
systemPrompt: `You are a senior insurance agent with 20 years of experience.
               Always:
               - Explain insurance terms clearly
               - Compare at least 3 quotes
               - Highlight potential savings
               Never:
               - Make assumptions about coverage needs
               - Skip rate comparisons`
```

### 6. **Handle Costs**

Monitor API usage through the result message:

```typescript
case 'result':
  console.log('Cost:', message.total_cost_usd);
  if (message.total_cost_usd > 0.50) {
    console.warn('High cost query!');
  }
```

### 7. **Use Hooks for Monitoring**

Add logging and telemetry:

```typescript
hooks: {
  PreToolUse: [async (input) => {
    logToMonitoring('tool_use_start', {
      tool: input.tool_name,
      timestamp: Date.now()
    });
    return { continue: true, decision: 'approve' as const };
  }]
}
```

---

## Troubleshooting

### "API key not found"
Make sure you've set `ANTHROPIC_API_KEY` in your environment or `.env` file.

### Agent doesn't use tools
- Check that tools are in `allowedTools` array
- Ensure tool descriptions clearly explain when to use them
- Try being more explicit in your prompt

### Agent takes too long
- Reduce `maxTurns`
- Use more specific prompts
- Consider using faster models for simple tasks

### Permission errors
Set appropriate `permissionMode`:
- Use `'bypassPermissions'` for automated workflows
- Use `'default'` for interactive use

---

## Real-World Use Cases

### 1. **Code Analysis Agent**
Automatically review pull requests, find bugs, check style compliance.

### 2. **Documentation Generator**
Read code files and generate API documentation.

### 3. **Data Pipeline Agent**
Fetch data, transform it, load into databases.

### 4. **Customer Support Agent**
Answer questions using knowledge base tools.

### 5. **Insurance Rating Agent** (Like ITD Integration)
Query rates from APIs, compare quotes, recommend best options.

### 6. **DevOps Assistant**
Deploy applications, monitor logs, handle incidents.

---

## Next Steps

1. **Run all examples** in order to understand concepts progressively
2. **Modify examples** to experiment with different prompts and tools
3. **Build your own agent** for a real use case
4. **Read the full documentation** at [docs.claude.com](https://docs.claude.com/en/api/agent-sdk/typescript)

---

## Resources

- [Claude API Documentation](https://docs.anthropic.com)
- [Agent SDK TypeScript Docs](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Zod Documentation](https://zod.dev)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)

---

## Support

If you encounter issues:
1. Check the examples in this tutorial
2. Review error messages carefully
3. Consult the official Claude documentation
4. Experiment with simpler prompts first

---

## License

MIT - Feel free to use these examples in your projects!

---

**Happy Agent Building! 🤖**
