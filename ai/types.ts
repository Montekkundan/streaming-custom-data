import type { UIMessage } from "ai";
import { z } from "zod";

export const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Define your custom message type with data part schemas
export type MyUIMessage = UIMessage<
  MessageMetadata, // metadata type
  {
    weather: {
      city: string;
      weather?: string;
      status: "loading" | "success";
    };
    notification: {
      message: string;
      level: "info" | "warning" | "error";
    };
  } // data parts type
>;
