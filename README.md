# Minimal chat template

 [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMontekkundan%2Fchat-template&env=AI_GATEWAY_API_KEY)

 This repo is a minimal chat template used to experiment with the AI SDK's
 streaming and UI message features.

 Getting started
 ---------------

 - Clone the repository
 - Add your AI gateway key to `.env` as `AI_GATEWAY_API_KEY`
 - Install and run the dev server:

 ```bash
# Minimal chat template

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMontekkundan%2Fchat-template&env=AI_GATEWAY_API_KEY)

This repo is a minimal chat template used to experiment with the AI SDK's streaming and UI message features.

## Getting started

- Clone the repository
- Add your AI gateway key to `.env` as `AI_GATEWAY_API_KEY`
- Install and run the dev server:

# Minimal chat template

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMontekkundan%2Fchat-template&env=AI_GATEWAY_API_KEY)

This repo is a minimal chat template used to experiment with the AI SDK's streaming and UI message features.

## Getting started

- Clone the repository
- Add your AI gateway key to `.env` as `AI_GATEWAY_API_KEY`
- Install and run the dev server:

```bash
bun install
bun dev
```

## Streaming metadata & custom data parts (overview)

This project demonstrates how to stream both:

- UI data parts (e.g. `data-weather`, `source-url`, transient notifications)
- Message-level metadata (attached to `message.metadata` on the client)

### Key points

- `enqueue` is a Web Streams API method (ReadableStreamDefaultController.enqueue) used to push values into a ReadableStream. It's not specific to the AI SDK.
- The AI SDK exposes helpers such as `streamText()` (LLM streaming) and `toUIMessageStream()` which yield UI-friendly chunks. Those chunks can be forwarded into your own ReadableStream and sent to the client as SSE.
- To attach metadata to a message, the server must send a `message-metadata` UI chunk at the appropriate time (after `start` and/or on `finish`).

## How the example in this repo works

1. `app/api/chat/route.ts` creates a combined `ReadableStream` which:
   - enqueues initial transient parts (notification, source, loading state)
   - forwards chunks from the LLM stream returned by `streamText(...).toUIMessageStream()`
   - injects a `message-metadata` chunk immediately after the LLM's `start` chunk
   - relies on a finish-time handler to enqueue reconciliation and finish metadata

2. `ai/utils.ts` exports `createResponseHandler(getController)` which returns an `onFinish` callback. That callback reads the stream controller (via the supplied getter) and enqueues finish-time chunks (reconciled data part, transient completion notification, and `message-metadata` with token usage).

### Why we use a controller getter

- The ReadableStream's controller is only available inside the stream's `start(controller)` callback. The `streamText(...).onFinish` handler runs later (when the LLM finishes). Passing a getter that returns the current controller lets the finish handler enqueue into the same stream.

### Typical chunk sequence the client receives

1. data-notification (transient)
2. source-url
3. data-weather (loading)
4. text-start (LLM message start)
5. message-metadata (createdAt/model)  <-- injected after text-start
6. text-delta / text-end (the LLM text streaming)
7. data-weather (reconciliation: status=success) <-- emitted from onFinish
8. data-notification (completed, transient)
9. message-metadata (totalTokens) <-- emitted from onFinish

## Testing & verification

- Start the dev server and open the chat UI in your browser.
- Use the browser console (or the `console.log` already in `app/page.tsx`) to inspect the `messages` array as it updates. You should see `message.metadata` populated for the assistant message and `message.parts` containing the data parts.

### Example: run locally

```bash
# install deps
bun install

# start dev server
bun dev
```

## Troubleshooting

- If `message.metadata` is undefined on the client, ensure you return the response that contains the `message-metadata` chunks (this app builds a combined ReadableStream and returns it via `createUIMessageStreamResponse`).
- Use server console logs to verify `onFinish` ran and enqueued finish-time chunks (the finish handler logs errors to the server console).

If you want the code annotated with more teaching comments, there is a concise minimal comment set in the source; the detailed explanation is here so code files remain focused and compact.
