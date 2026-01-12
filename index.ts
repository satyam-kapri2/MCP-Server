import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { api } from "./api.js";
import { SearchServicesSchema, ExplainDiscountSchema } from "./schemas.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
const server = new McpServer({
  name: "harito-services-mcp",
  version: "1.0.0",
});

server.registerTool(
  "search_services",
  {
    title: "Search Harito Services",
    description:
      "Search Harito services with pricing. Discounts are not included.",
    inputSchema: SearchServicesSchema,
  },
  async ({ q, page = 1, limit = 20 }) => {
    try {
      const response = await api.get("/service/search-full", {
        params: { q, page, limit },
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
            hasPotentialDiscounts: true,
          })),
        })),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sanitized, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: err.response?.data?.error || "Failed to search services",
          },
        ],
      };
    }
  }
);

server.registerTool(
  "explain_service_discounts",
  {
    title: "Explain Service Discounts",
    description: "Explain how discounts may be applied for a service",
    inputSchema: ExplainDiscountSchema,
  },
  async ({ service_id }) => {
    try {
      await api.get(`/service/${service_id}`);
    } catch {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Invalid service ID",
          },
        ],
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
`,
        },
      ],
    };
  }
);

// const transport = new StdioServerTransport();
const transport = new StreamableHTTPServerTransport();
server.connect(transport);
