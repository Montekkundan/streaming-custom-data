import type { UIMessage, UIMessageChunk, UIMessageStreamWriter } from "ai";
import { convertToModelMessages, generateObject } from "ai";
import { z } from "zod";

export function buildDataPart<T = unknown>(
  kind: string,
  payload: T,
  id?: string,
  transient = false
): UIMessageChunk {
  const type = kind === "notification" ? "data-notification" : `data-${kind}`;
  const chunk: Record<string, unknown> = { type, data: payload };
  if (id) {
    chunk.id = id;
  }
  if (transient) {
    chunk.transient = true;
  }
  return chunk as UIMessageChunk;
}

export function makeMessageMetadata(
  metadata: Record<string, unknown>
): UIMessageChunk {
  return {
    type: "message-metadata",
    messageMetadata: metadata,
  } as UIMessageChunk;
}

export function makeResponseHandler(
  getController: () => ReadableStreamDefaultController<UIMessageChunk> | null
) {
  return {
    onFinish(event: unknown) {
      try {
        const controller = getController();
        if (!controller) {
          return;
        }
        controller.enqueue(
          buildDataPart(
            "notification",
            { message: "Request completed", level: "info" },
            undefined,
            true
          )
        );
        const evt = event as
          | { totalUsage?: { totalTokens?: number } }
          | undefined;
        controller.enqueue(
          makeMessageMetadata({ totalTokens: evt?.totalUsage?.totalTokens })
        );
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error("response handler error:", err);
      }
    },
  };
}

export function enqueueProgress(
  controller: ReadableStreamDefaultController<UIMessageChunk>,
  phase: string,
  message: string,
  options: { transient?: boolean } = {}
) {
  controller.enqueue({
    type: "data-progress",
    data: { type: "progress", phase, message },
    transient: options.transient ?? true,
  } as UIMessageChunk);
}

export function writeSuggestionsChunk(
  writer: UIMessageStreamWriter,
  suggestions: Array<{ text: string; action: string }>,
  options: { transient?: boolean } = {}
) {
  writer.write({
    type: "data-suggestions",
    data: { type: "suggestions", data: suggestions },
    transient: options.transient ?? false,
  } as UIMessageChunk);
}

export function enqueueSuggestions(
  controller: ReadableStreamDefaultController<UIMessageChunk>,
  suggestions: Array<{ text: string; action: string }>,
  options: { transient?: boolean } = {}
) {
  controller.enqueue({
    type: "data-suggestions",
    data: { type: "suggestions", data: suggestions },
    transient: options.transient ?? false,
  } as UIMessageChunk);
}

export function buildSourceUrls(city?: string) {
  const slug = city ? city.replace(/\s+/g, "-").toLowerCase() : "unknown";
  return [
    {
      sourceId: makeId("source"),
      url: `https://wttr.in/${encodeURIComponent(slug)}`,
      title: `wttr.in — ${city ?? "weather"}`,
    },
    {
      sourceId: makeId("source"),
      url: `https://weather.com/weather/today/l/${encodeURIComponent(slug)}`,
      title: `Weather.com — ${city ?? "weather"}`,
    },
    {
      sourceId: makeId("source"),
      url: `https://openweathermap.org/find?q=${encodeURIComponent(slug)}`,
      title: `OpenWeatherMap — ${city ?? "weather"}`,
    },
  ];
}

export function enqueueSourceUrl(
  controller: ReadableStreamDefaultController<UIMessageChunk>,
  source: { sourceId: string; url: string; title?: string }
) {
  controller.enqueue({
    type: "source-url",
    sourceId: source.sourceId,
    url: source.url,
    title: source.title,
  } as UIMessageChunk);
}

export async function extractCityFromMessages(
  model: unknown,
  messages: UIMessage[]
): Promise<string | undefined> {
  try {
    const schema = z.object({ city: z.string().optional() });
    const resp = await generateObject({
      model: model as unknown as never,
      system:
        'Extract a single city/location mentioned in the user\'s message. Return JSON with { "city": "City Name" } or {} if none.',
      messages: convertToModelMessages(messages.slice(-1)),
      maxOutputTokens: 50,
      schema,
    });
    const obj = resp.object as unknown as { city?: string } | undefined;
    if (obj?.city && typeof obj.city === "string") {
      return obj.city.trim();
    }
  } catch (err) {
    console.error("extract city error:", err);
  }
  return;
}

export function makeId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function generateSuggestedActions(
  model: unknown,
  convoMessages: UIMessage[]
): Promise<Array<{ text: string; action: string }>> {
  try {
    const schema = z.object({
      actions: z.array(z.object({ text: z.string(), action: z.string() })),
    });
    const resp = await generateObject({
      model: model as unknown as never,
      system:
        "You are an assistant. Based on the conversation context and the last response, suggest 3-4 relevant follow-up actions or questions. Return a JSON object with an `actions` array.",
      messages: convertToModelMessages(convoMessages.slice(-1)),
      maxOutputTokens: 500,
      schema,
    });
    const obj = resp.object as unknown as {
      actions?: Array<{ text: string; action: string }>;
    };
    return Array.isArray(obj?.actions) ? obj.actions : [];
  } catch (err) {
    console.error("suggestions error:", err);
    return [];
  }
}

export async function fetchWeatherSummary(
  city?: string
): Promise<{ weatherText?: string; error?: string }> {
  try {
    const q = city ?? "";
    const url = `https://wttr.in/${encodeURIComponent(q)}?format=j1`;
    const res = await fetch(url);
    if (!res.ok) {
      return { error: `weather fetch failed: ${res.status}` };
    }
    const json = (await res.json()) as unknown;
    type WttrJson = {
      current_condition?: Array<{
        temp_C?: string;
        weatherDesc?: Array<{ value?: string }>;
        [k: string]: unknown;
      }>;
    };
    const current = (json as WttrJson)?.current_condition?.[0];
    const tempC = current?.temp_C;
    const desc = current?.weatherDesc?.[0]?.value;
    const weatherText = tempC
      ? `${tempC}°C - ${desc ?? ""}`
      : JSON.stringify(json);
    return { weatherText };
  } catch (err: unknown) {
    console.error("fetchWeatherSummary error:", err);
    return { error: String(err) };
  }
}
