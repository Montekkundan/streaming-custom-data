# Streaming metadata & custom data parts

This project demonstrates how to stream both:

- UI data parts (e.g. `data-weather`, `source-url`, transient notifications)
- Message-level metadata (attached to `message.metadata` on the client)


## How the example in this repo works

1. `app/api/chat/route.ts` creates a combined `ReadableStream` which:
   - enqueues initial transient parts (notification, source, loading state)
   - forwards chunks from the LLM stream returned by `streamText(...).toUIMessageStream()`
   - injects a `message-metadata` chunk immediately after the LLM's `start` chunk
   - relies on a finish-time handler to enqueue reconciliation and finish metadata

2. `ai/utils.ts` exports `makeResponseHandler(getController)` which returns an `onFinish` callback. That callback reads the stream controller (via the supplied getter) and enqueues finish-time chunks (reconciled data part, transient completion notification, and `message-metadata` with token usage).

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
