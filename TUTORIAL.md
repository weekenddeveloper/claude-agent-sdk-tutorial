# Step-by-Step Tutorial: Building AI Agents with Claude

This guide walks you through building AI agents from absolute basics to advanced patterns.

---

## Part 1: Understanding the Fundamentals

### What Happens When You Run an Agent?

1. **You provide a prompt** - "Analyze this code file"
2. **The AI receives the prompt** along with available tools
3. **The AI thinks** about what steps to take
4. **The AI calls tools** if needed (e.g., Read file)
5. **Tool executes** and returns results
6. **The AI processes results** and continues or responds
7. **You get the final answer**

### Key Mental Model

Think of the agent as a **smart assistant** that:
- Can read and understand your instructions
- Knows what tools are available
- Decides which tools to use and when
- Can use multiple tools in sequence
- Learns from tool results to complete the task

---

## Part 2: Your First Agent (5 minutes)

Let's build the simplest possible agent:

### Step 1: Create a new file

```bash
touch my-first-agent.ts
```

### Step 2: Write this code

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function main(): Promise<void> {
  console.log('Starting agent...\n');

  // Create a query
  const response = query({
    prompt: "Explain what an API is in 2 sentences"
  });

  // Handle the response
  for await (const message of response) {
    if (message.type === 'assistant') {
      console.log('Answer:', message.message.content);
    }
  }

  console.log('\nDone!');
}

main();
```

### Step 3: Run it

```bash
npx tsx my-first-agent.ts
```

### What Just Happened?

1. You imported `query` from the SDK
2. You called `query()` with a prompt
3. The agent responded with an explanation
4. You printed the response

**No tools were needed** - the agent already knows what an API is!

---

## Part 3: Adding Tools (15 minutes)

Now let's give the agent abilities it doesn't have by default.

### Example: Temperature Converter Agent

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Step 1: Define a custom tool
const convertTemperature = tool(
  'convert_temperature',
  'Convert temperature between Celsius and Fahrenheit',
  z.object({
    value: z.number().describe('Temperature value'),
    from: z.enum(['C', 'F']).describe('Convert from (C or F)'),
    to: z.enum(['C', 'F']).describe('Convert to (C or F)')
  }),
  async (args: { value: number; from: 'C' | 'F'; to: 'C' | 'F' }) => {
    let result: number;

    if (args.from === 'C' && args.to === 'F') {
      result = (args.value * 9/5) + 32;
    } else if (args.from === 'F' && args.to === 'C') {
      result = (args.value - 32) * 5/9;
    } else {
      result = args.value;
    }

    return {
      content: [{
        type: 'text',
        text: `${args.value}°${args.from} = ${result.toFixed(2)}°${args.to}`
      }]
    };
  }
);

// Step 2: Use the tool in a query
async function main(): Promise<void> {
  const response = query({
    prompt: "Convert 100°F to Celsius and 0°C to Fahrenheit",
    options: {
      allowedTools: [convertTemperature]  // Give agent access to our tool
    }
  });

  for await (const message of response) {
    if (message.type === 'assistant') {
      console.log('Agent:', message.message.content);
    } else if (message.type === 'tool_use') {
      console.log('Using tool:', message.tool_name);
    }
  }
}

main();
```

### What's New?

1. **`tool()` function** - Defines what the tool does
2. **Zod schema** - Specifies what inputs the tool needs
3. **Tool implementation** - The actual conversion logic
4. **`allowedTools`** - Tells the agent it can use this tool

### How the Agent Decides to Use Tools

The agent reads your prompt and thinks:
- "They want temperature conversions"
- "I have a `convert_temperature` tool"
- "The description matches what they need"
- "I'll call it twice - once for each conversion"

---

## Part 4: Working with Files (20 minutes)

Let's build an agent that can read and analyze files.

### Example: Simple File Analyzer

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { writeFileSync } from 'fs';

// First, create a sample file
writeFileSync('sample.ts', `
function calculateTotal(items: Array<{ price: number }>): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
`);

async function main(): Promise<void> {
  const response = query({
    prompt: "Read sample.ts and suggest improvements to the code",
    options: {
      allowedTools: ['Read'],  // Built-in tool for reading files
      model: 'claude-3-5-sonnet-20241022'
    }
  });

  for await (const message of response) {
    if (message.type === 'assistant') {
      console.log(message.message.content);
    } else if (message.type === 'tool_use') {
      console.log(`\n[Reading file: ${message.tool_name}]\n`);
    }
  }
}

main();
```

### What Built-in Tools Are Available?

- **`Read`** - Read file contents
- **`Write`** - Create new files
- **`Edit`** - Modify existing files
- **`Grep`** - Search in files
- **`Glob`** - Find files by pattern
- **`Bash`** - Run shell commands
- **`WebSearch`** - Search the web
- **`WebFetch`** - Fetch web pages

---

## Part 5: Multi-Step Workflows (30 minutes)

Agents shine when handling complex, multi-step tasks.

### Example: Code Refactoring Agent

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function main(): Promise<void> {
  const response = query({
    prompt: `
      Please refactor sample.ts:
      1. Read the file
      2. Identify code smells
      3. Create an improved version
      4. Write it to sample-improved.ts
      5. Explain the changes you made
    `,
    options: {
      allowedTools: ['Read', 'Write'],
      permissionMode: 'acceptEdits',  // Auto-approve file operations
      maxTurns: 10  // Allow multiple back-and-forth steps
    }
  });

  for await (const message of response) {
    switch (message.type) {
      case 'assistant':
        console.log('\n📝', message.message.content, '\n');
        break;

      case 'tool_use':
        console.log('🔧 Using:', message.tool_name);
        break;

      case 'result':
        console.log('\n✅ Complete! Turns:', message.total_turns);
        break;
    }
  }
}

main();
```

### The Agent's Thought Process

1. "I need to read sample.ts first" → Calls `Read` tool
2. Reads the code and analyzes it
3. "I found issues: no reduce(), magic numbers, no comments"
4. Writes improved version → Calls `Write` tool
5. Explains what changed

**You didn't specify HOW to do each step** - the agent figured it out!

---

## Part 6: Hooks and Monitoring (20 minutes)

Hooks let you intercept and monitor tool usage.

### Example: Logging Agent

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

interface ToolLogEntry {
  tool: string;
  time: number;
  phase: 'start' | 'end';
}

const toolLog: ToolLogEntry[] = [];

async function main(): Promise<void> {
  const response = query({
    prompt: "Count how many TypeScript files are in the examples folder",
    options: {
      allowedTools: ['Bash', 'Glob'],

      hooks: {
        // Runs BEFORE each tool use
        PreToolUse: [
          async (input) => {
            console.log(`⏰ About to use: ${input.tool_name}`);
            toolLog.push({
              tool: input.tool_name,
              time: Date.now(),
              phase: 'start'
            });

            // Must return approval
            return {
              continue: true,
              decision: 'approve' as const
            };
          }
        ],

        // Runs AFTER each tool use
        PostToolUse: [
          async (input) => {
            console.log(`✅ Completed: ${input.tool_name}`);
            toolLog.push({
              tool: input.tool_name,
              time: Date.now(),
              phase: 'end'
            });

            return { continue: true };
          }
        ]
      }
    }
  });

  for await (const message of response) {
    if (message.type === 'assistant') {
      console.log('\nAgent:', message.message.content, '\n');
    } else if (message.type === 'result') {
      console.log('\n--- Tool Usage Log ---');
      console.log(toolLog);
    }
  }
}

main();
```

### Why Use Hooks?

- **Logging** - Track which tools are used
- **Monitoring** - Measure performance
- **Validation** - Check tool inputs before execution
- **Rate limiting** - Prevent excessive API calls
- **Debugging** - Understand agent behavior

---

## Part 7: Real-World Example - Insurance Quote Agent (45 minutes)

Let's build a complete, production-ready agent.

### Goal
Create an agent that:
1. Collects customer information
2. Calls insurance rating APIs
3. Compares quotes
4. Recommends the best option
5. Generates a summary report

### Implementation

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface CustomerData {
  age: number;
  state: string;
  vehicleYear: number;
  coverageLimits: string;
}

// Tool 1: Validate customer data
const validateCustomer = tool(
  'validate_customer_data',
  'Validate that customer information is complete and correct',
  z.object({
    age: z.number(),
    state: z.string(),
    vehicleYear: z.number(),
    coverageLimits: z.string()
  }),
  async (args: CustomerData) => {
    const errors: string[] = [];

    if (args.age < 16) errors.push('Driver must be 16 or older');
    if (args.state.length !== 2) errors.push('Invalid state code');
    if (args.vehicleYear < 1990 || args.vehicleYear > 2025) {
      errors.push('Vehicle year out of range');
    }

    const isValid = errors.length === 0;
    const result: ValidationResult = { isValid, errors };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result)
      }]
    };
  }
);

interface Quote {
  carrier: string;
  premium: number;
  term: number;
  deductible: number;
}

interface QuoteRequest {
  customerData: {
    age: number;
    state: string;
    vehicleYear: number;
    vehicleMake: string;
    vehicleModel: string;
  };
}

// Tool 2: Get insurance quotes (simulated)
const getQuotes = tool(
  'get_insurance_quotes',
  'Get insurance quotes from multiple carriers',
  z.object({
    customerData: z.object({
      age: z.number(),
      state: z.string(),
      vehicleYear: z.number(),
      vehicleMake: z.string(),
      vehicleModel: z.string()
    })
  }),
  async (args: QuoteRequest) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const quotes: Quote[] = [
      {
        carrier: 'Progressive',
        premium: 850 + (args.customerData.age < 25 ? 400 : 0),
        term: 6,
        deductible: 500
      },
      {
        carrier: 'State Farm',
        premium: 920 + (args.customerData.age < 25 ? 350 : 0),
        term: 6,
        deductible: 500
      },
      {
        carrier: 'Geico',
        premium: 780 + (args.customerData.age < 25 ? 450 : 0),
        term: 6,
        deductible: 500
      }
    ];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(quotes, null, 2)
      }]
    };
  }
);

interface ReportInput {
  quotes: Quote[];
  recommendation: string;
}

// Tool 3: Generate report
const generateReport = tool(
  'generate_report',
  'Generate a formatted insurance quote comparison report',
  z.object({
    quotes: z.array(z.any()),
    recommendation: z.string()
  }),
  async (args: ReportInput) => {
    let report = '# Insurance Quote Comparison Report\n\n';
    report += '## Quotes Received\n\n';

    args.quotes.forEach((q, idx) => {
      report += `### ${idx + 1}. ${q.carrier}\n`;
      report += `- Premium: $${q.premium}/6mo\n`;
      report += `- Deductible: $${q.deductible}\n\n`;
    });

    report += '## Recommendation\n\n';
    report += args.recommendation;

    return {
      content: [{
        type: 'text',
        text: report
      }]
    };
  }
);

// Main agent
async function main(): Promise<void> {
  console.log('🚗 Insurance Quote Agent Starting...\n');

  const response = query({
    prompt: `
      Help me get insurance quotes:

      Customer Info:
      - Age: 28
      - State: TX
      - Vehicle: 2020 Honda Accord
      - Requested Coverage: 100/300/50

      Please:
      1. Validate the customer data
      2. Get quotes from carriers
      3. Compare and recommend the best option
      4. Generate a summary report
    `,
    options: {
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: `You are an experienced insurance agent.
                     Always validate data before getting quotes.
                     Recommend based on best value, not just lowest price.
                     Explain your reasoning clearly.`,
      allowedTools: [
        validateCustomer,
        getQuotes,
        generateReport
      ],
      maxTurns: 15,
      permissionMode: 'default'
    }
  });

  for await (const message of response) {
    switch (message.type) {
      case 'assistant':
        console.log('\n💬 Agent:', message.message.content, '\n');
        break;

      case 'tool_use':
        console.log(`🔧 Calling: ${message.tool_name}`);
        break;

      case 'result':
        console.log('\n' + '='.repeat(50));
        console.log('✅ Quote Process Complete!');
        console.log('='.repeat(50));
        console.log('Total Cost:', message.total_cost_usd);
        console.log('Turns:', message.total_turns);
        break;
    }
  }
}

main();
```

### What This Example Teaches

1. **Tool Chaining** - Agent uses tools in sequence
2. **Data Validation** - Ensures data quality before processing
3. **External API Simulation** - Pattern for real API integration
4. **Domain Logic** - Business rules encoded in tools
5. **Report Generation** - Structured output creation
6. **System Prompts** - Guides agent behavior and decision-making

---

## Part 8: Common Patterns

### Pattern 1: The Analyzer
```typescript
// Agent reads files, analyzes content, generates report
allowedTools: ['Read', 'Grep', 'Write']
prompt: "Analyze all .ts files and write findings to report.md"
```

### Pattern 2: The Transformer
```typescript
// Agent reads input, transforms it, writes output
allowedTools: ['Read', customTransformTool, 'Write']
prompt: "Convert all JSON files to YAML format"
```

### Pattern 3: The Orchestrator
```typescript
// Agent coordinates multiple tools/APIs
allowedTools: [apiTool1, apiTool2, compareTool, reportTool]
prompt: "Get data from both APIs, compare, and recommend"
```

### Pattern 4: The Assistant
```typescript
// Interactive agent that helps users step-by-step
maxTurns: 20
permissionMode: 'default'  // Ask before each action
```

---

## Part 9: Testing and Debugging

### Debugging Checklist

1. **Check tool descriptions** - Are they clear?
2. **Review prompts** - Are instructions specific?
3. **Monitor tool usage** - Is agent using right tools?
4. **Check schemas** - Are inputs validated correctly?
5. **Review system prompts** - Does agent understand its role?

### Testing Strategy

```typescript
// 1. Test tools independently
async function testTool(): Promise<void> {
  const result = await myTool({ testInput: 'value' });
  console.assert(result.content[0].text === 'expected');
}

// 2. Test with simple prompts first
prompt: "Use calculate_premium with age=25, value=20000"

// 3. Add complexity gradually
prompt: "Get quotes and compare them"

// 4. Monitor costs
if (message.total_cost_usd > 1.00) {
  console.warn('Expensive query!');
}
```

---

## Part 10: Production Checklist

Before deploying your agent:

- [ ] **Error handling** - Try-catch blocks everywhere
- [ ] **Cost monitoring** - Track API usage
- [ ] **Rate limiting** - Prevent excessive calls
- [ ] **Input validation** - Use Zod schemas
- [ ] **Logging** - Use hooks for audit trails
- [ ] **Testing** - Test with edge cases
- [ ] **Documentation** - Document tools and prompts
- [ ] **Security** - Never expose API keys
- [ ] **Permissions** - Use appropriate permission modes
- [ ] **Timeouts** - Handle long-running operations

---

## Conclusion

You now know how to:
- ✅ Create basic agents
- ✅ Define custom tools
- ✅ Use built-in tools
- ✅ Handle multi-step workflows
- ✅ Monitor and debug agents
- ✅ Build production-ready systems

**Next Steps:**
1. Run all examples in the `examples/` folder
2. Modify them for your use cases
3. Build your own agent from scratch
4. Share what you've built!

---

**Happy Building! 🎉**
