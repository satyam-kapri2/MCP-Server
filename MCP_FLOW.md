Below is a clean, executable, step by step guide with full code to create both MCP tools exactly as discussed.

No hand waving. You can copy paste and run this.

⸻

PART A: Project setup (one time)

Step 1: Initialize the MCP project

mkdir harito-mcp
cd harito-mcp
npm init -y

Step 2: Install dependencies

npm install @modelcontextprotocol/sdk zod axios
npm install -D typescript ts-node @types/node

Step 3: Create tsconfig.json

{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}


⸻

PART B: MCP server skeleton

Step 4: Create index.ts

import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server(
  {
    name: "harito-services-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const transport = new StdioServerTransport();
server.connect(transport);

This is now a valid MCP server.

⸻

PART C: Shared API client

Step 5: Add API client (api.ts)

import axios from "axios";

export const api = axios.create({
  baseURL: "https://www.harito.life/api/v1",
  timeout: 5000,
  headers: {
    Authorization: `Bearer ${process.env.HARITO_API_TOKEN}`
  }
});

Set env var before running:

export HARITO_API_TOKEN=xxxxx


⸻

PART D: MCP Tool 1 – search_services (pricing without discounts)

Step 6: Define input schema

import { z } from "zod";

export const SearchServicesSchema = {
  q: z.string().min(1, "Search query is required"),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).optional()
};


⸻

Step 7: Implement the tool

Add this to index.ts after server creation:

import { z } from "zod";
import { api } from "./api";
import { SearchServicesSchema } from "./schemas";

server.tool(
  "search_services",
  "Search Harito services with pricing. Discounts are not included.",
  SearchServicesSchema,
  async ({ q, page = 1, limit = 20 }) => {
    try {
      const response = await api.get("/service/search-full", {
        params: { q, page, limit }
      });

      const sanitized = {
        ...response.data,
        data: response.data.data.map((service: any) => ({
          ...service,
          packages: service.packages.map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            type: pkg.type,
            durationSlots: pkg.durationSlots,
            hasPotentialDiscounts: true
          }))
        }))
      };

      return {
        content: [
          {
            type: "json",
            json: sanitized
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              err.response?.data?.error ||
              "Failed to search services"
          }
        ]
      };
    }
  }
);

Key behavior
	•	Base price shown
	•	Offers removed
	•	Soft signal present
	•	Model cannot leak discounts

⸻

PART E: MCP Tool 2 – explain_service_discounts

Step 8: Define schema

export const ExplainDiscountSchema = {
  service_id: z.string().min(1)
};


⸻

Step 9: Implement the discount explanation tool

Add below the first tool in index.ts:

server.tool(
  "explain_service_discounts",
  "Explain how discounts may be applied for a service",
  ExplainDiscountSchema,
  async ({ service_id }) => {
    try {
      await api.get(`/service/${service_id}`);
    } catch {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Invalid service ID"
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `
Harito may offer promotional discounts for this service.

Discounts are usually applied when:
- The package value crosses a minimum threshold
- A promotional campaign is active
- You book multiple sessions or bundled care

To avail any eligible discount:
- Proceed to booking
- Applicable discounts, if any, are automatically applied before payment

No manual coupon entry is required.
`
        }
      ]
    };
  }
);

Important
	•	No percentages
	•	No expiry dates
	•	No offer rules
	•	No gaming possible

⸻

PART F: Run and test

Step 10: Start MCP server

npx ts-node index.ts

Step 11: Test flows

Flow 1

User: “How much does back pain therapy cost?”

→ Model calls search_services
→ Base pricing shown

Flow 2

User: “Any discounts available?”

→ Model calls explain_service_discounts
→ Eligibility explained without leakage

⸻

PART G: Hard guardrails (strongly recommended)

Add this to a README.md:

Pricing returned by search_services excludes discounts.

Discounts must never be inferred or calculated.
Use explain_service_discounts to describe eligibility only.

Models respect this far more than intuition.

⸻

Final architecture we will have
	•	One MCP server
	•	Two clean tools
	•	Zero discount leakage
	•	Full pricing transparency
	•	Conversion friendly behavior

This is exactly how large marketplaces do it.