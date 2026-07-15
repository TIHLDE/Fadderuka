"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "~/components/ui/use-toast";
import { api } from "~/trpc/react";

type GroupViewProps = {
  gruppeId: string;
  canPost: boolean;
  currentUserName: string;
  channel: "ANNOUNCEMENT" | "CHAT";
  title: string;
  composerTitle: string;
  composerSubtitle: string;
  composerPlaceholder: string;
  emptyMessage: string;
};

export function GroupView({
  gruppeId,
  canPost,
  currentUserName,
  channel,
  title,
  composerTitle,
  composerSubtitle,
  composerPlaceholder,
  emptyMessage,
}: GroupViewProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMessage, setComposerMessage] = useState("");

  const utils = api.useUtils();

  const { data: messages, isLoading } = api.gruppe.getMessages.useQuery({
    gruppeId,
    channel,
  });

  const postMutation = api.gruppe.postMessage.useMutation({
    onSuccess: () => {
      void utils.gruppe.getMessages.invalidate({ gruppeId, channel });
      setComposerMessage("");
      setIsComposerOpen(false);
      toast({ title: "Melding sendt" });
    },
    onError: (err) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = api.gruppe.deleteMessage.useMutation({
    onSuccess: () => {
      void utils.gruppe.getMessages.invalidate({ gruppeId, channel });
      toast({ title: "Melding slettet" });
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const content = composerMessage.trim();
    if (!content) return;
    postMutation.mutate({ gruppeId, content, channel });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return new Date(date).toLocaleTimeString("no-NO", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (days === 1) return "I gar";
    if (days < 7) return `${days} dager siden`;
    return new Date(date).toLocaleDateString("no-NO", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <section className="!space-y-6">
      <div className="flex flex-wrap items-end justify-between !gap-4">
        <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-white sm:text-[36px]">
          {title}
        </h2>
        {canPost && (
          <button
            className="inline-flex items-center !gap-2 rounded-xl border border-[#73aac4] bg-[#212d49] !px-4 !py-2 text-sm font-semibold text-white transition hover:bg-[#29385a] sm:text-base"
            type="button"
            onClick={() => setIsComposerOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {composerTitle}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center !py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#73aac4] border-t-transparent" />
        </div>
      ) : messages && messages.length > 0 ? (
        <div className="!space-y-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className="rounded-xl border border-[#73aac4]/70 bg-[color:var(--surface-soft)] !p-6 shadow-[0_24px_60px_rgba(4,10,23,0.35)] backdrop-blur"
            >
              <div className="flex flex-wrap items-start justify-between !gap-3">
                <h3 className="text-lg font-extrabold text-white sm:text-xl">
                  {message.author.name}
                </h3>
                <div className="flex items-center !gap-2">
                  <span className="text-sm font-medium text-[#8694b4] sm:text-base">
                    {formatTime(message.createdAt)}
                  </span>
                  {(message.author.name === currentUserName) && (
                    <button
                      type="button"
                      onClick={() =>
                        deleteMutation.mutate({ messageId: message.id })
                      }
                      className="!p-1 text-red-400/50 hover:text-red-400 transition"
                      title="Slett melding"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="!mt-3 text-base font-medium text-[#8694b4] sm:text-lg">
                {message.content}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-center text-[#8694b4] !py-8">{emptyMessage}</p>
      )}

      {/* Composer modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center !px-4 !py-12">
          <button
            aria-label="Lukk"
            className="absolute inset-0 bg-black/60"
            type="button"
            onClick={() => {
              setIsComposerOpen(false);
              setComposerMessage("");
            }}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#73aac4]/70 bg-[color:var(--surface-strong)] !p-6 text-white shadow-[0_40px_90px_rgba(2,6,23,0.6)] backdrop-blur sm:!p-8">
            <div className="flex items-start justify-between !gap-4">
              <div>
                <h3 className="text-xl font-semibold">{composerTitle}</h3>
                <p className="!mt-1 text-sm text-[#8694b4]">
                  {composerSubtitle}
                </p>
              </div>
              <button
                className="rounded-full border border-[#73aac4]/50 !px-3 !py-1 text-sm text-[#d8e6ff] transition hover:bg-white/10"
                type="button"
                onClick={() => {
                  setIsComposerOpen(false);
                  setComposerMessage("");
                }}
              >
                Lukk
              </button>
            </div>

            <form className="!mt-6 !space-y-4" onSubmit={handleSubmit}>
              <label className="block !space-y-2 text-sm font-medium text-[#d8e6ff]">
                Melding
                <textarea
                  className="min-h-[140px] w-full rounded-xl border border-[#73aac4]/40 bg-[#111a2f] !px-4 !py-3 text-base text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
                  placeholder={composerPlaceholder}
                  value={composerMessage}
                  onChange={(e) => setComposerMessage(e.target.value)}
                />
              </label>

              <div className="flex flex-wrap items-center justify-end !gap-3">
                <button
                  className="rounded-xl border border-[#73aac4]/50 !px-4 !py-2 text-sm text-[#d8e6ff] transition hover:bg-white/10"
                  type="button"
                  onClick={() => {
                    setIsComposerOpen(false);
                    setComposerMessage("");
                  }}
                >
                  Avbryt
                </button>
                <button
                  className="rounded-xl bg-[#2c3a5d] !px-4 !py-2 text-sm font-semibold text-white transition hover:bg-[#33466f] disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={
                    composerMessage.trim().length === 0 || postMutation.isPending
                  }
                >
                  {postMutation.isPending ? "Sender..." : "Send melding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
