import { useState } from "react";
import type { MyUIMessage } from "@/ai/types";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type ModelPopoverProps = {
  messages: MyUIMessage[];
};

export function ModelPopover({ messages }: ModelPopoverProps) {
  const [open, setOpen] = useState(false);

  // find the most recent message that contains metadata
  type Usage = {
    cachedInputTokens?: number;
    cached_input_tokens?: number;
    inputTokens?: number;
    input_tokens?: number;
    outputTokens?: number;
    output_tokens?: number;
    reasoningTokens?: number;
    totalTokens?: number;
  };

  type Metadata = {
    createdAt?: number | string;
    model?: string;
    totalTokens?: number;
    total_tokens?: number;
    totalUsage?: Usage;
    total_usage?: Usage;
    inputTokens?: number;
    outputTokens?: number;
  };

  const lastWithMetadata = [...messages].reverse().find((m) => {
    const mm = m as unknown as Record<string, unknown>;
    return mm.metadata != null;
  }) as unknown as { metadata?: Metadata } | undefined;

  const metadata = lastWithMetadata?.metadata ?? null;

  // derived display values (keep JSX simple to avoid complexity lint)
  const displayModel = String(
    (metadata as Metadata | null)?.model ?? "Unknown model"
  );
  const displayCreatedAt = fmtDate((metadata as Metadata | null)?.createdAt);

  const sessionTotal = fmtNumber(
    (metadata as Metadata | null)?.totalTokens ??
      (metadata as Metadata | null)?.total_tokens ??
      ((metadata as Metadata | null)?.totalUsage as Usage | undefined)
        ?.totalTokens
  );

  const inputTokensDisplay = fmtNumber(
    (
      (metadata as Metadata | null)?.totalUsage ??
      (metadata as Metadata | null)?.total_usage
    )?.inputTokens ??
      (
        (metadata as Metadata | null)?.totalUsage ??
        (metadata as Metadata | null)?.total_usage
      )?.input_tokens ??
      (metadata as Metadata | null)?.inputTokens
  );

  const outputTokensDisplay = fmtNumber(
    (
      (metadata as Metadata | null)?.totalUsage ??
      (metadata as Metadata | null)?.total_usage
    )?.outputTokens ??
      (
        (metadata as Metadata | null)?.totalUsage ??
        (metadata as Metadata | null)?.total_usage
      )?.output_tokens ??
      (metadata as Metadata | null)?.outputTokens
  );

  const cachedReadsDisplay = fmtNumber(
    (
      (metadata as Metadata | null)?.totalUsage ??
      (metadata as Metadata | null)?.total_usage
    )?.cachedInputTokens ??
      (
        (metadata as Metadata | null)?.totalUsage ??
        (metadata as Metadata | null)?.total_usage
      )?.cached_input_tokens
  );

  const reasoningDisplay = fmtNumber(
    (
      (metadata as Metadata | null)?.totalUsage ??
      (metadata as Metadata | null)?.total_usage
    )?.reasoningTokens
  );

  function fmtNumber(v: unknown) {
    if (v == null) {
      return "-";
    }
    const n = Number(v as unknown as number);
    if (!Number.isFinite(n)) {
      return String(v);
    }
    return n.toLocaleString();
  }

  function fmtDate(v: unknown) {
    const n = Number(v as unknown as number);
    if (!Number.isFinite(n)) {
      return String(v ?? "-");
    }
    try {
      return new Date(n).toLocaleString();
    } catch (_) {
      return String(v);
    }
  }

  return (
    <Popover onOpenChange={(v) => setOpen(v)} open={open}>
      <PopoverTrigger asChild>
        <Button onClick={() => setOpen(true)} size="sm" variant="ghost">
          Context
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="max-w-sm space-y-4">
        {metadata ? (
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{displayModel}</div>
                <div className="text-muted-foreground text-xs">
                  {displayCreatedAt}
                </div>
              </div>
              <div className="text-muted-foreground text-xs">Metadata</div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded border p-3">
                <div className="text-muted-foreground text-xs">
                  Total tokens
                </div>
                <div className="mt-1 font-mono text-sm">{sessionTotal}</div>
              </div>

              <div className="rounded border p-3">
                <div className="text-muted-foreground text-xs">
                  Input tokens
                </div>
                <div className="mt-1 font-mono text-sm">
                  {inputTokensDisplay}
                </div>
              </div>

              <div className="rounded border p-3">
                <div className="text-muted-foreground text-xs">
                  Output tokens
                </div>
                <div className="mt-1 font-mono text-sm">
                  {outputTokensDisplay}
                </div>
              </div>

              <div className="rounded border p-3">
                <div className="text-muted-foreground text-xs">Cached read</div>
                <div className="mt-1 font-mono text-sm">
                  {cachedReadsDisplay}
                </div>
              </div>

              <div className="col-span-2 mt-1 grid grid-cols-3 gap-2">
                <div className="rounded border p-2">
                  <div className="text-muted-foreground text-xs">Reasoning</div>
                  <div className="mt-1 font-mono text-sm">
                    {reasoningDisplay}
                  </div>
                </div>

                <div className="rounded border p-2">
                  <div className="text-muted-foreground text-xs">
                    Cached reads
                  </div>
                  <div className="mt-1 font-mono text-sm">
                    {cachedReadsDisplay}
                  </div>
                </div>

                <div className="rounded border p-2">
                  <div className="text-muted-foreground text-xs">
                    Usage total
                  </div>
                  <div className="mt-1 font-mono text-sm">{sessionTotal}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No metadata</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
