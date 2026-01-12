import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { api } from "./api.js";
import express from "express";
import { SearchServicesSchema, ExplainDiscountSchema } from "./schemas.js";

const app = express();

// 1. Required: Middleware to parse JSON bodies
app.use(express.json());

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

// 2. Modern "Streamable HTTP" Route
// This single route handles both the SSE stream (GET) and messages (POST)
app.all("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport();

  // Create a safe cleanup function
  // We use a flag to prevent double-closing which causes "terminated" errors
  let isClosed = false;
  const safeClose = async () => {
    if (isClosed) return;
    isClosed = true;
    try {
      await transport.close();
    } catch (error) {
      // Ignore errors during close (connection already dead)
      console.log("Transport closed silently");
    }
  };

  try {
    await server.connect(transport);

    // Handle Request
    // We pass req.body explicitly, but default to safe empty object if undefined
    await transport.handleRequest(req, res, req.body || {});
  } catch (error) {
    // Only log actual errors, not normal disconnects
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP Error" });
    }
  }

  // Cleanup on connection close
  req.on("close", safeClose);
  req.on("end", safeClose);
  req.on("error", safeClose);
});

// 3. Start Listening

app.listen(3000, "0.0.0.0", () => {
  console.log(`Harito MCP server running on port 3000`);
  console.log(`MCP Endpoint: http://localhost:3000/mcp`);
});
