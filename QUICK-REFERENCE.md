# Claude Agent SDK - Quick Reference

## Installation

```bash
npm install @anthropic-ai/claude-agent-sdk zod typescript tsx
```

## Basic Usage

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const response = query({
  prompt: "Your instruction here"
});

for await (const message of response) {
  if (message.type === 'assistant') {
    console.log(message.message.content);
  }
}
```

### Running TypeScript Files

```bash
npx tsx your-file.ts
```

## Query Options

```typescript
query({
  prompt: "...",
  options: {
    model: 'claude-3-5-sonnet-20241022',  // Model to use
    systemPrompt: '...',                   // Sets agent behavior
    allowedTools: ['Read', 'Write'],       // Available tools
    maxTurns: 10,                          // Max interactions
    permissionMode: 'default',             // Permission handling
    hooks: { /* ... */ }                   // Event hooks
  }
})
```

## Permission Modes

| Mode | Description |
|------|-------------|
| `'default'` | Ask before each tool use |
| `'acceptEdits'` | Auto-approve file edits only |
| `'bypassPermissions'` | Auto-approve all tools |
| `'plan'` | Create plan without execution |

## Creating Custom Tools

```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myTool = tool(
  'tool_name',                    // Unique identifier
  'What this tool does',          // Description for the AI
  z.object({                      // Input schema
    param1: z.string().describe('Description'),
    param2: z.number().min(0)
  }),
  async (args: { param1: string; param2: number }) => {  // Implementation with types
    // Your logic here
    return {
      content: [{
        type: 'text',
        text: 'Result text'
      }]
    };
  }
);
```

## Built-in Tools

| Tool | Purpose |
|------|---------|
| `Read` | Read file contents |
| `Write` | Create/overwrite files |
| `Edit` | Make precise edits to files |
| `Grep` | Search file contents |
| `Glob` | Find files by pattern |
| `Bash` | Execute shell commands |
| `WebSearch` | Search the web |
| `WebFetch` | Fetch web content |

## Message Types

```typescript
for await (const message of response) {
  switch (message.type) {
    case 'assistant':
      // AI's text response
      message.message.content
      break;

    case 'tool_use':
      // Agent calling a tool
      message.tool_name
      message.tool_input
      break;

    case 'tool_result':
      // Tool execution result
      message.is_error
      message.content
      break;

    case 'result':
      // Final metadata
      message.total_cost_usd
      message.total_turns
      break;
  }
}
```

## Hooks

```typescript
hooks: {
  PreToolUse: [
    async (input) => {
      // Run before tool execution
      console.log('Using:', input.tool_name);

      return {
        continue: true,
        decision: 'approve' as const  // 'approve', 'reject', or 'prompt'
      };
    }
  ],

  PostToolUse: [
    async (input) => {
      // Run after tool execution
      console.log('Completed:', input.tool_name);

      return { continue: true };
    }
  ],

  UserPromptSubmit: [
    async (input) => {
      // Run when user submits prompt
      return { continue: true };
    }
  ]
}
```

## Zod Schema Quick Reference

```typescript
import { z } from 'zod';

// Primitives
z.string()
z.number()
z.boolean()
z.date()

// Constraints
z.string().min(1).max(100)
z.number().min(0).max(100)
z.string().email()
z.string().url()
z.string().length(2)  // Exactly 2 chars

// Optional/Nullable
z.string().optional()
z.string().nullable()

// Enums
z.enum(['option1', 'option2'])

// Objects
z.object({
  name: z.string(),
  age: z.number()
})

// Arrays
z.array(z.string())
z.array(z.object({ id: z.number() }))

// Descriptions (important for AI!)
z.string().describe('User email address')
z.number().describe('Age in years')

// TypeScript type inference
type MyType = z.infer<typeof mySchema>;
```

## Common Patterns

### Pattern: File Analysis
```typescript
query({
  prompt: "Analyze all TypeScript files in ./src",
  options: {
    allowedTools: ['Glob', 'Read', 'Grep', 'Write'],
    systemPrompt: 'You are a code analyzer',
    maxTurns: 10
  }
})
```

### Pattern: API Integration
```typescript
const apiTool = tool(
  'call_api',
  'Call external API',
  z.object({ endpoint: z.string() }),
  async (args: { endpoint: string }) => {
    const response = await fetch(args.endpoint);
    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data) }]
    };
  }
);
```

### Pattern: Multi-Step Workflow
```typescript
query({
  prompt: `
    1. Read input.json
    2. Process the data
    3. Write results to output.json
    4. Summarize what was done
  `,
  options: {
    allowedTools: ['Read', processTool, 'Write'],
    permissionMode: 'acceptEdits',
    maxTurns: 15
  }
})
```

### Pattern: Interactive Assistant
```typescript
query({
  prompt: userQuestion,
  options: {
    allowedTools: [knowledgeBaseTool, searchTool],
    permissionMode: 'default',  // Ask before actions
    maxTurns: 5
  }
})
```

## Error Handling

```typescript
try {
  const response = query({ prompt: "..." });

  for await (const message of response) {
    if (message.type === 'tool_result' && message.is_error) {
      console.error('Tool error:', message.content);
    }
  }
} catch (error) {
  console.error('Agent error:', (error as Error).message);
}
```

## Cost Management

```typescript
for await (const message of response) {
  if (message.type === 'result') {
    console.log('Cost:', message.total_cost_usd);

    if (message.total_cost_usd > 0.50) {
      console.warn('High cost query!');
    }
  }
}
```

## Environment Variables

```bash
# .env file
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

```typescript
// Load in your code
import 'dotenv/config';
// Or manually set
process.env.ANTHROPIC_API_KEY = 'your-key';
```

## Best Practices

✅ **DO:**
- Write clear, specific prompts
- Use descriptive tool names and descriptions
- Add Zod descriptions to all schema fields
- Set appropriate maxTurns for complexity
- Handle errors with try-catch
- Monitor costs
- Use hooks for logging

❌ **DON'T:**
- Use vague prompts
- Skip input validation
- Ignore tool errors
- Set maxTurns too high unnecessarily
- Expose API keys in code
- Skip testing

## Debugging Tips

1. **Tool not being used?**
   - Check tool description is clear
   - Verify tool is in allowedTools array
   - Make prompt more explicit

2. **Agent takes too long?**
   - Reduce maxTurns
   - Use more specific prompt
   - Consider simpler tools

3. **Unexpected behavior?**
   - Add hooks to monitor tool usage
   - Review system prompt
   - Test tools independently

4. **High costs?**
   - Reduce maxTurns
   - Use smaller model for simple tasks
   - Cache results when possible

## Model Selection

| Model | Use Case |
|-------|----------|
| `claude-3-5-sonnet-20241022` | Best for complex reasoning |
| `claude-3-opus-20240229` | Most capable (slower/expensive) |
| `claude-3-sonnet-20240229` | Good balance |
| `claude-3-haiku-20240307` | Fast for simple tasks |

## Complete Example Template

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Define tools
const myTool = tool(
  'my_tool',
  'Tool description',
  z.object({
    input: z.string().describe('Input description')
  }),
  async (args: { input: string }) => {
    // Implementation
    return {
      content: [{
        type: 'text',
        text: 'Result'
      }]
    };
  }
);

// Run agent
async function main(): Promise<void> {
  try {
    const response = query({
      prompt: "Your task here",
      options: {
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: 'You are a helpful assistant',
        allowedTools: [myTool, 'Read', 'Write'],
        maxTurns: 10,
        permissionMode: 'default',
        hooks: {
          PreToolUse: [async (input) => {
            console.log('Using:', input.tool_name);
            return { continue: true, decision: 'approve' as const };
          }]
        }
      }
    });

    for await (const message of response) {
      switch (message.type) {
        case 'assistant':
          console.log('Agent:', message.message.content);
          break;
        case 'tool_use':
          console.log('Tool:', message.tool_name);
          break;
        case 'result':
          console.log('Cost:', message.total_cost_usd);
          console.log('Turns:', message.total_turns);
          break;
      }
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

main();
```

---

**For full documentation:** [docs.claude.com/en/api/agent-sdk/typescript](https://docs.claude.com/en/api/agent-sdk/typescript)
