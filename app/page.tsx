"use client";
import { useChat } from "@ai-sdk/react";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Fragment, type SetStateAction, useState } from "react";
import type { MyUIMessage } from "@/ai/types";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Settings } from "@/components/settings";

const suggestions = [
  "Tell me a joke about technology.",
  "What's the weather like today in Laval, Quebec?",
  "Give me a fun fact about space.",
];

export default function Chat() {
  const [input, setInput] = useState("");
  const [dynamicSuggestions, setDynamicSuggestions] = useState<
    Array<{ text: string; action: string }>
  >([]);
  const [transientNotification, setTransientNotification] = useState<
    string | null
  >(null);
  const { messages, sendMessage, regenerate, stop, status } =
    useChat<MyUIMessage>({
      onData: (dataPart) => {
        const part = dataPart as unknown as { type?: string; data?: unknown };

        if (part.type === "data-notification") {
          const pd = part.data as { message?: string } | undefined;
          if (pd?.message && typeof pd.message === "string") {
            setTransientNotification(pd.message);
          }
          return;
        }

        if (part.type === "data-suggestions") {
          const pd = part.data as { data?: unknown } | undefined;
          const candidate = pd?.data;
          if (!Array.isArray(candidate)) {
            return;
          }

          const parsed = parseSuggestions(candidate);
          if (parsed.length > 0) {
            setDynamicSuggestions(parsed);
          }
        }
      },
    });

  function parseSuggestions(
    candidate: unknown
  ): { text: string; action: string }[] {
    if (!Array.isArray(candidate)) {
      return [];
    }
    return (candidate as unknown[])
      .map((it) => {
        if (!it || typeof it !== "object") {
          return null;
        }
        const obj = it as Record<string, unknown>;
        if (typeof obj.text === "string" && typeof obj.action === "string") {
          return { text: obj.text, action: obj.action };
        }
        return null;
      })
      .filter(Boolean) as { text: string; action: string }[];
  }

  const handleSubmit = (message: PromptInputMessage) => {
    // @ts-expect-error I dont know why this is happening
    const hasText = Boolean(message.text);

    if (!hasText) {
      return;
    }

    sendMessage(
      {
        // @ts-expect-error ditto
        text: message.text,
      },
      {
        body: {
          apiKey: localStorage.getItem("AI_GATEWAY_API_KEY") || undefined,
        },
      }
    );
    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(
      { text: suggestion },
      {
        body: {
          apiKey: localStorage.getItem("AI_GATEWAY_API_KEY") || undefined,
        },
      }
    );
    setInput("");
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <Settings />
      </div>
      {transientNotification && (
        <div className="fixed top-4 left-4 z-50 rounded border border-yellow-300 bg-yellow-100 px-3 py-2">
          {transientNotification}
        </div>
      )}
      <div className="relative mx-auto size-full h-screen max-w-4xl p-6">
        <div className="flex h-full flex-col">
          <Conversation>
            <ConversationContent>
              {messages.map((message, messageIndex) => (
                <Fragment key={message.id}>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text": {
                        const isLastMessage =
                          messageIndex === messages.length - 1;
                        return (
                          <Fragment key={`${message.id}-${i}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                {message.metadata?.createdAt && (
                                  <span className="text-gray-500 text-sm">
                                    {new Date(
                                      message.metadata.createdAt
                                    ).toLocaleTimeString()}
                                  </span>
                                )}
                                <MessageResponse>{part.text}</MessageResponse>
                                {/* Display additional metadata */}
                                {message.metadata?.totalTokens && (
                                  <div className="text-gray-400 text-xs">
                                    {message.metadata.totalTokens} tokens
                                  </div>
                                )}
                              </MessageContent>
                            </Message>
                            {message.role === "assistant" && isLastMessage && (
                              <MessageActions>
                                <MessageAction
                                  label="Retry"
                                  onClick={() => regenerate()}
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                                <MessageAction
                                  label="Copy"
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
                                  }
                                >
                                  <CopyIcon className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                          </Fragment>
                        );
                      }
                      case "data-weather":
                        return (
                          <Message
                            from={message.role}
                            key={`${message.id}-${i}`}
                          >
                            <MessageContent>
                              <span className="weather-update">
                                {part.data.status === "loading" ? (
                                  <>Getting weather for {part.data.city}...</>
                                ) : (
                                  <>
                                    Weather in {part.data.city}:{" "}
                                    {part.data.weather}
                                  </>
                                )}
                              </span>
                            </MessageContent>
                          </Message>
                        );
                      case "source-url":
                        return (
                          <Message
                            from={message.role}
                            key={`${message.id}-src-${i}`}
                          >
                            <MessageContent>
                              <div className="text-gray-700 text-sm">
                                Source:{" "}
                                <a
                                  href={part.url}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  {part.title ?? part.url}
                                </a>
                              </div>
                            </MessageContent>
                          </Message>
                        );
                      default:
                        return null;
                    }
                  })}
                </Fragment>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="mt-4 grid gap-4">
            <Suggestions>
              {(dynamicSuggestions.length > 0
                ? dynamicSuggestions.map((s) => s.text)
                : suggestions
              ).map((suggestionText) => (
                <Suggestion
                  disabled={status === "streaming" || status === "submitted"}
                  key={suggestionText}
                  onClick={() => {
                    // prefer action if dynamic suggestion exists
                    const ds = dynamicSuggestions.find(
                      (d) => d.text === suggestionText
                    );
                    if (ds) {
                      sendMessage(
                        { text: ds.action },
                        {
                          body: {
                            apiKey:
                              localStorage.getItem("AI_GATEWAY_API_KEY") ||
                              undefined,
                          },
                        }
                      );
                    } else {
                      handleSuggestionClick(suggestionText);
                    }
                  }}
                  suggestion={suggestionText}
                />
              ))}
            </Suggestions>

            <PromptInput globalDrop multiple onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  disabled={status === "streaming" || status === "submitted"}
                  onChange={(e: {
                    target: { value: SetStateAction<string> };
                  }) => setInput(e.target.value)}
                  placeholder="Lets have fun with tool calling..."
                  value={input}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputActionMenu />
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!(input || status)}
                  status={status}
                  stop={stop}
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="mx-auto font-light text-xs">
              Thank you{" "}
              <a
                className="text-black transition-colors hover:text-green-700"
                href="https://vercel.com"
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                Vercel ▲
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
