#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const C2_URL = process.env.C2_URL || 'http://143.198.36.132:9090';
const C2_CALLSIGN = process.env.C2_CALLSIGN || 'UNKNOWN';

async function c2Fetch(path, options = {}) {
  const url = `${C2_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function c2Post(path, body) {
  return c2Fetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const server = new McpServer({
  name: `fleet-c2-${C2_CALLSIGN}`,
  version: '1.0.0',
});

// Tool: checkin
server.tool(
  'checkin',
  'Check in with C2 command. Report your current status.',
  {
    status: z.enum(['ACTIVE', 'IDLE', 'TASKED', 'COMPLETE', 'ERROR']).describe('Current unit status'),
    brief: z.string().describe('One-line status summary'),
  },
  async ({ status, brief }) => {
    const result = await c2Post('/checkin', { callsign: C2_CALLSIGN, status, brief });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// Tool: check_orders
server.tool(
  'check_orders',
  'Check for pending orders from C2 command.',
  {},
  async () => {
    const result = await c2Fetch(`/orders/${C2_CALLSIGN}`);
    if (Array.isArray(result) && result.length === 0) {
      return { content: [{ type: 'text', text: 'No pending orders.' }] };
    }
    const text = Array.isArray(result)
      ? result.map(o => `--- ${o.filename} ---\n${o.content}`).join('\n\n')
      : JSON.stringify(result, null, 2);
    return { content: [{ type: 'text', text }] };
  }
);

// Tool: submit_report
server.tool(
  'submit_report',
  'Submit a report to C2 command (SITREP, INTREP, SPOTREP, or REQUEST).',
  {
    type: z.enum(['SITREP', 'INTREP', 'SPOTREP', 'REQUEST']).describe('Report type'),
    content: z.string().describe('Report content'),
    priority: z.enum(['FLASH', 'IMMEDIATE', 'ROUTINE']).default('ROUTINE').describe('Priority level'),
  },
  async ({ type, content, priority }) => {
    const result = await c2Post('/report', { callsign: C2_CALLSIGN, type, content, priority });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// Tool: send_handoff
server.tool(
  'send_handoff',
  'Hand off work to another fleet unit. C2 command is auto-notified.',
  {
    to: z.string().describe('Target unit callsign'),
    mission: z.string().describe('What the handoff is about'),
    state: z.string().describe('Current state of the work'),
    files: z.string().describe('Relevant files or paths'),
    dependencies: z.string().describe('Dependencies or blockers'),
    next_steps: z.string().describe('What the receiving unit should do next'),
  },
  async ({ to, mission, state, files, dependencies, next_steps }) => {
    const result = await c2Post('/handoff', {
      from: C2_CALLSIGN, to, mission, state, files, dependencies, next_steps,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// Tool: get_roster
server.tool(
  'get_roster',
  'Get the fleet roster with all unit callsigns and details.',
  {},
  async () => {
    const result = await c2Fetch('/roster');
    return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
  }
);

// Tool: get_context
server.tool(
  'get_context',
  'Get your unit state and any pending orders. Use at startup for situational awareness.',
  {},
  async () => {
    const [unitState, orders] = await Promise.all([
      c2Fetch(`/units/${C2_CALLSIGN}`),
      c2Fetch(`/orders/${C2_CALLSIGN}`),
    ]);
    const parts = [
      `UNIT STATE:\n${JSON.stringify(unitState, null, 2)}`,
      '',
      `PENDING ORDERS:`,
    ];
    if (Array.isArray(orders) && orders.length === 0) {
      parts.push('None.');
    } else if (Array.isArray(orders)) {
      for (const o of orders) {
        parts.push(`--- ${o.filename} ---\n${o.content}`);
      }
    } else {
      parts.push(JSON.stringify(orders, null, 2));
    }
    return { content: [{ type: 'text', text: parts.join('\n') }] };
  }
);

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
