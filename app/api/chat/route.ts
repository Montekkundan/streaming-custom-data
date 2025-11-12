import { createGateway } from "@ai-sdk/gateway";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import {
  buildDataPart,
  buildSourceUrls,
  enqueueSourceUrl,
  enqueueSuggestions,
  extractCityFromMessages,
  fetchWeatherSummary,
  generateSuggestedActions,
  makeResponseHandler,
} from "@/ai/utils";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, apiKey }: { messages: UIMessage[]; apiKey?: string } =
    await req.json();

  const gateway = createGateway({
    apiKey: apiKey || process.env.AI_GATEWAY_API_KEY,
  });

  const city =
    (await extractCityFromMessages(gateway("openai/gpt-4o"), messages)) ??
    "San Francisco";

  let streamController: ReadableStreamDefaultController<UIMessageChunk> | null =
    null;
  const responseHandler = makeResponseHandler(() => streamController);

  const llmModelId = "openai/gpt-4o-mini";
  const llmModel = gateway(llmModelId);

  const llmResult = streamText({
    model: llmModel,
    messages: convertToModelMessages(messages),
    onFinish: responseHandler.onFinish,
  });

  const combinedStream = new ReadableStream<UIMessageChunk>({
    async start(controller) {
      streamController = controller;

      controller.enqueue(
        buildDataPart(
          "notification",
          { message: "Processing your request...", level: "info" },
          undefined,
          true
        )
      );

      const sources = buildSourceUrls(city);
      for (const s of sources) {
        enqueueSourceUrl(controller, s);
      }

      controller.enqueue({
        type: "data-weather",
        id: "weather-1",
        data: { city, status: "loading" },
      } as UIMessageChunk);

      try {
        await forwardLlmTokens(controller, llmResult);
        await fetchAndEnqueueWeather(controller, city);
        await generateAndEnqueueSuggestions(controller, gateway, messages);
      } catch (err) {
        controller.error(err as unknown);
        return;
      } finally {
        controller.close();
      }
    },
  });

  async function forwardLlmTokens(
    controller: ReadableStreamDefaultController<UIMessageChunk>,
    llm: ReturnType<typeof streamText>
  ) {
    const llmStream = llm.toUIMessageStream();
    for await (const chunk of llmStream as AsyncIterable<UIMessageChunk>) {
      controller.enqueue(chunk);
      if ((chunk as { type?: string }).type === "start") {
        controller.enqueue({
          type: "message-metadata",
          messageMetadata: { createdAt: Date.now(), model: llmModelId },
        } as UIMessageChunk);
      }
    }
  }

  // helper: fetch weather and enqueue reconciled data-weather
  async function fetchAndEnqueueWeather(
    controller: ReadableStreamDefaultController<UIMessageChunk>,
    cityName: string
  ) {
    try {
      const { weatherText, error } = await fetchWeatherSummary(cityName);
      if (weatherText) {
        controller.enqueue({
          type: "data-weather",
          id: "weather-1",
          data: { city: cityName, status: "success", weather: weatherText },
        } as UIMessageChunk);
      } else {
        controller.enqueue({
          type: "data-weather",
          id: "weather-1",
          data: { city: cityName, status: "error", error: error ?? "unknown" },
        } as UIMessageChunk);
      }
    } catch (err) {
      console.error("weather fetch failed:", err);
      controller.enqueue({
        type: "data-weather",
        id: "weather-1",
        data: { city: cityName, status: "error", error: String(err) },
      } as UIMessageChunk);
    }
  }

  // helper: generate suggestions and enqueue them
  async function generateAndEnqueueSuggestions(
    controller: ReadableStreamDefaultController<UIMessageChunk>,
    gatewayRef: ReturnType<typeof createGateway>,
    convoMessages: UIMessage[]
  ) {
    try {
      const suggestions = await generateSuggestedActions(
        gatewayRef("openai/gpt-4o"),
        convoMessages
      );
      if (suggestions && suggestions.length > 0) {
        enqueueSuggestions(controller, suggestions, { transient: false });
      }
    } catch (err) {
      console.error("suggestion generation failed:", err);
    }
  }

  return createUIMessageStreamResponse({ stream: combinedStream });
}
