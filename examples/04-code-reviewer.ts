/**
 * Example 4: Code Reviewer Agent with Hooks
 *
 * This example demonstrates:
 * - Using hooks to monitor tool usage
 * - Permission modes to control agent behavior
 * - Writing analysis results to files
 */

import { query, PreToolUseHookInput, PostToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ToolUsageLogEntry {
  timestamp: string;
  tool: string;
  phase: 'pre' | 'post';
  success?: boolean;
}

interface ToolCounts {
  [toolName: string]: number;
}


// Create a sample code file to review
function createCodeSample(): string {
  const sampleDir = join(__dirname, 'code-to-review');

  try {
    mkdirSync(sampleDir, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  const codeSample = `
/**
 * User Authentication Service
 */
class AuthService {
  constructor(database) {
    this.db = database;
    this.sessions = {};
  }

  // Login method - has several issues
  async login(username, password) {
    // Issue 1: No input validation
    const user = await this.db.query('SELECT * FROM users WHERE username = "' + username + '"');

    // Issue 2: Plain text password comparison
    if (user && user.password === password) {
      // Issue 3: Weak session ID generation
      const sessionId = Math.random().toString();
      this.sessions[sessionId] = user;

      // Issue 4: No session expiration
      return { success: true, sessionId: sessionId };
    }

    return { success: false };
  }

  // Missing: logout method
  // Missing: password reset functionality
  // Missing: rate limiting

  async getUserById(id) {
    // Issue 5: No error handling
    return await this.db.query('SELECT * FROM users WHERE id = ' + id);
  }
}

module.exports = AuthService;
`;

  const filePath = join(sampleDir, 'AuthService.js');
  writeFileSync(filePath, codeSample);
  console.log('Sample code created at:', filePath);

  return filePath;
}

async function runCodeReviewerAgent(): Promise<void> {
  console.log('=== Example 4: Code Reviewer Agent with Hooks ===\n');

  const codeFile = createCodeSample();
  const toolUsageLog: ToolUsageLogEntry[] = [];

  try {
    const response = query({
      prompt: `Please perform a comprehensive security and code quality review of ${codeFile}.
               Create a detailed report and save it to a file called 'review-report.md'.`,
      options: {
        model: 'claude-3-5-sonnet-20241022' as const,
        systemPrompt: `You are a senior security engineer and code reviewer.
                       Focus on:
                       1. Security vulnerabilities
                       2. Best practices violations
                       3. Missing functionality
                       4. Code quality issues

                       Provide specific recommendations for each issue found.
                       Write your findings to a markdown report file.`,

        allowedTools: ['Read', 'Write', 'Grep'] as const,

        // 'default' mode allows hooks to be called for permission decisions
        permissionMode: 'default' as const,

        maxTurns: 15,

        // Hooks allow you to intercept and monitor tool usage
        hooks: {
          PreToolUse: [{
            hooks: [async (input, toolUseID, _options) => {
              // Type assertion - we know this is PreToolUse input
              const preInput = input as PreToolUseHookInput;

              console.log(`\n[HOOK] About to use tool: ${preInput.tool_name}`);
              console.log(`[HOOK] Tool use ID: ${toolUseID}`);
              console.log(`[HOOK] Tool input:`, preInput.tool_input);

              toolUsageLog.push({
                timestamp: new Date().toISOString(),
                tool: preInput.tool_name,
                phase: 'pre'
              });

              console.log(`[HOOK] Pre-hook - Log entries: ${toolUsageLog.length}`);

              // Return permission decision to allow the tool use
              return {
                hookSpecificOutput: {
                  hookEventName: 'PreToolUse',
                  permissionDecision: 'allow',
                  permissionDecisionReason: 'Tool approved by hook'
                }
              };
            }]
          }],

          PostToolUse: [{
            hooks: [async (input, toolUseID, _options) => {
              // Type assertion - we know this is PostToolUse input
              const postInput = input as PostToolUseHookInput;

              console.log(`\n[HOOK] Completed tool: ${postInput.tool_name}`);
              console.log(`[HOOK] Tool use ID: ${toolUseID}`);
              console.log(`[HOOK] Tool response:`, postInput.tool_response);

              toolUsageLog.push({
                timestamp: new Date().toISOString(),
                tool: postInput.tool_name,
                phase: 'post',
                success: Boolean(postInput.tool_response && typeof postInput.tool_response === 'object' && !(postInput.tool_response as any)?.is_error)
              });

              console.log(`[HOOK] Post-hook - Total log entries: ${toolUsageLog.length}`);

              return {
                hookSpecificOutput: {
                  hookEventName: 'PostToolUse'
                }
              };
            }]
          }]
        }
      }
    });

    for await (const message of response) {
      switch (message.type) {
        case 'assistant':
          console.log('\nAssistant:', message.message.content);
          break;

        case 'stream_event':
          console.log('\nStream event:', message.event);
          break;

        case 'result':
          console.log('\n--- Review Complete ---');
          console.log('Total cost:', message.total_cost_usd);
          console.log('Total turns:', message.num_turns);

          // Save tool usage log
          console.log('\nTool Usage Summary:');
          console.log(`[DEBUG] Total tool usage log entries: ${toolUsageLog.length}`);
          console.log(`[DEBUG] Tool usage log contents:`, toolUsageLog);

          const toolCounts: ToolCounts = {};
          const postLogs = toolUsageLog.filter(log => log.phase === 'post');
          console.log(`[DEBUG] Post-tool logs found: ${postLogs.length}`);

          postLogs.forEach(log => {
            toolCounts[log.tool] = (toolCounts[log.tool] || 0) + 1;
          });
          console.log(toolCounts);
          break;
      }
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', String(error));
    }
  }
}

// Run the example
runCodeReviewerAgent();
