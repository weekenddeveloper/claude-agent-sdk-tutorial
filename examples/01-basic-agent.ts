/**
 * Example 1: Basic AI Agent
 *
 * This example demonstrates the simplest way to create an AI agent
 * that can answer questions and perform basic tasks.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function runBasicAgent(): Promise<void> {
  console.log('=== Example 1: Basic AI Agent ===\n');

  try {
    // Create a simple query - the agent will respond to your prompt
    const response = query({
      prompt: "What are the key principles of good software design? List 3 principles.",
      options: {
        // Specify which Claude model to use
        model: 'claude-3-5-sonnet-20241022',

        // Optional: Add a system prompt to guide the agent's behavior
        systemPrompt: "You are a helpful software engineering mentor. Provide clear, concise explanations.",

        // Limit the number of turns (back-and-forth exchanges)
        maxTurns: 1
      }
    });

    // The query function returns an async iterator
    // We iterate through the messages as they stream in
    for await (const message of response) {
      switch (message.type) {
        case 'assistant':
          // Assistant messages contain the AI's response
          console.log('Assistant:', message.message.content);
          break;

        case 'result':
          // Result message contains metadata about the interaction
          console.log('\n--- Interaction Complete ---');
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
runBasicAgent();
