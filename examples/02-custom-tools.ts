/**
 * Example 2: AI Agent with Custom Tools
 *
 * This example shows how to create custom tools that the agent can use.
 * Tools are functions the AI can call to interact with external systems.
 */

import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Define types for our tool arguments
type CalculatePremiumArgs = {
  age: number;
  vehicleValue: number;
  accidentHistory: number;
};

type VehicleInfoArgs = {
  make: string;
  model: string;
  year: number;
};

// Define a custom tool for calculating insurance premiums
const calculatePremiumTool = tool(
  'calculate_premium',
  'Calculate insurance premium based on risk factors',
  // Define the input schema using Zod
  {
    age: z.number().min(16).max(100).describe('Driver age'),
    vehicleValue: z.number().min(0).describe('Vehicle value in dollars'),
    accidentHistory: z.number().min(0).max(10).describe('Number of accidents in past 5 years')
  },
  // Tool implementation - this is what runs when the AI calls the tool
  async (args: CalculatePremiumArgs) => {
    console.log(`[TOOL CALLED] calculate_premium with args:`, args);

    // Simple premium calculation logic
    let basePremium = 500;

    // Age factor
    if (args.age < 25) basePremium *= 1.5;
    else if (args.age > 65) basePremium *= 1.2;

    // Vehicle value factor
    basePremium += args.vehicleValue * 0.01;

    // Accident history factor
    basePremium *= (1 + args.accidentHistory * 0.15);

    const totalPremium = Math.round(basePremium * 100) / 100;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          basePremium: 500,
          ageFactor: args.age < 25 ? 1.5 : (args.age > 65 ? 1.2 : 1.0),
          vehicleValueSurcharge: Math.round(args.vehicleValue * 0.01 * 100) / 100,
          accidentSurcharge: Math.round(basePremium * args.accidentHistory * 0.15 * 100) / 100,
          totalPremium: totalPremium
        }, null, 2)
      }]
    };
  }
);

// Define another custom tool for getting vehicle information
const getVehicleInfoTool = tool(
  'get_vehicle_info',
  'Get detailed information about a vehicle by make and model',
  {
    make: z.string().describe('Vehicle make (e.g., Toyota)'),
    model: z.string().describe('Vehicle model (e.g., Camry)'),
    year: z.number().min(1990).max(2025).describe('Vehicle year')
  },
  async (args: VehicleInfoArgs) => {
    console.log(`[TOOL CALLED] get_vehicle_info with args:`, args);

    // Simulate vehicle database lookup
    const vehicleInfo = {
      make: args.make,
      model: args.model,
      year: args.year,
      safetyRating: 4.5,
      averageValue: 25000,
      theftRate: 'Low',
      repairCost: 'Medium'
    };

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(vehicleInfo, null, 2)
      }]
    };
  }
);

async function runCustomToolsAgent(): Promise<void> {
  console.log('=== Example 2: AI Agent with Custom Tools ===\n');

  try {
    const response = query({
      prompt: `I'm 22 years old and want to insure my 2020 Honda Accord worth $24,000.
               I've had 1 accident in the past 5 years.
               Can you calculate my insurance premium and provide vehicle info?`,
      options: {
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: 'You are an insurance agent assistant. Use the available tools to help calculate premiums and provide vehicle information.',
        // Register tools in an MCP server
        mcpServers: {
          insuranceTools: createSdkMcpServer({
            name: 'InsuranceTools',
            tools: [calculatePremiumTool, getVehicleInfoTool]
          })
        },
        // Specify which tools the agent can use
        allowedTools: ['calculate_premium', 'get_vehicle_info'],
        permissionMode: 'bypassPermissions',
        maxTurns: 5
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
runCustomToolsAgent();
