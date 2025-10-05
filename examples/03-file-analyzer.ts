/**
 * Example 3: File Analyzer Agent
 *
 * This example shows how to use built-in tools like Read, Grep, and Glob
 * to create an agent that can analyze files in your project.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// First, let's create some sample files to analyze
function setupSampleFiles(): string {
  const sampleDir = join(__dirname, 'sample-project');

  // Create sample JavaScript file
  const jsContent = `
// Sample JavaScript application
class UserManager {
  constructor() {
    this.users = [];
  }

  addUser(name, email) {
    const user = { id: this.users.length + 1, name, email };
    this.users.push(user);
    return user;
  }

  getUser(id) {
    return this.users.find(u => u.id === id);
  }

  // TODO: Add user validation
  // BUG: Email validation is missing
  validateEmail(email) {
    return email.includes('@');
  }
}

module.exports = UserManager;
`;

  // Create sample configuration file
  const configContent = `
{
  "appName": "Sample App",
  "version": "1.0.0",
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp_db"
  },
  "features": {
    "authentication": true,
    "logging": true
  }
}
`;

  // Write files
  try {
    mkdirSync(sampleDir, { recursive: true });
    writeFileSync(join(sampleDir, 'UserManager.js'), jsContent);
    writeFileSync(join(sampleDir, 'config.json'), configContent);
    console.log('Sample files created in:', sampleDir);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Could not create sample files:', errorMessage);
  }

  return sampleDir;
}

async function runFileAnalyzerAgent(): Promise<void> {
  console.log('=== Example 3: File Analyzer Agent ===\n');

  // Setup sample files
  const projectPath = setupSampleFiles();

  try {
    const response = query({
      prompt: `Analyze the JavaScript files in ${projectPath}.
               Find all TODO comments and potential bugs.
               Also check what's in the config.json file.`,
      options: {
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: `You are a code analysis assistant. Use the Read, Grep, and Glob tools to:
                       1. Find all JavaScript files
                       2. Search for TODO and BUG comments
                       3. Read configuration files
                       Provide a clear summary of your findings.`,
        // Allow the agent to use file-related tools
        allowedTools: ['Read', 'Grep', 'Glob'],
        maxTurns: 10,
        // Permission mode - 'bypassPermissions' allows tools to run without prompts
        permissionMode: 'bypassPermissions'
      }
    });

    for await (const message of response) {
      switch (message.type) {
        case 'assistant':
          console.log('\nAssistant:', message.message.content);
          break;

        case 'tool_use':
          console.log(`\n[Using Tool: ${message.tool_name}]`);
          break;

        case 'tool_result':
          if (!message.is_error) {
            console.log('[Tool completed successfully]');
          } else {
            console.log('[Tool error occurred]');
          }
          break;

        case 'result':
          console.log('\n--- Analysis Complete ---');
          console.log('Total cost:', message.total_cost_usd);
          console.log('Total turns:', message.num_turns);
          break;
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
  }
}

// Run the example
runFileAnalyzerAgent();
