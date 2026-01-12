import { z } from "zod";

export const SearchServicesSchema = {
  q: z.string().min(1, "Search query is required"),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).optional(),
};

export const ExplainDiscountSchema = {
  service_id: z.string().min(1),
};
