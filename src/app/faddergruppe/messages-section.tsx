"use client";

import { Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Reaction = "like" | "dislike" | null;

type Message = {
  id: string;
  name: string;
  time: string;
  body: string;
  reactions: {
    likes: number;
    dislikes: number;
  };
  userReaction: Reaction;
};

const defaultMessages: Message[] = [
  {
    id: "jan-olsen-1544",
    name: "Jan Olsen",
    time: "15:44",
    body: "Møt opp i Faddergata 8a klokken 19:00! Ta med all drikken du har!",
    reactions: { likes: 5, dislikes: 2 },
    userReaction: null,
  },
  {
    id: "ola-jansen-2d",
    name: "Ola Jansen",
    time: "2 dager siden",
    body: "Velkommen til Tihlde og faddergruppe 5! Den beste faddergruppa!",
    reactions: { likes: 0, dislikes: 0 },
    userReaction: null,
  },
];

const clampCount = (value: number) => Math.max(0, value);

const applyReaction = (message: Message, next: Reaction): Message => {
  if (!next) {
    return message;
  }

  const current = message.userReaction;
  let likes = message.reactions.likes;
  let dislikes = message.reactions.dislikes;

  if (current === next) {
    if (next === "like") {
      likes = clampCount(likes - 1);
    } else {
      dislikes = clampCount(dislikes - 1);
    }
    return {
      ...message,
      reactions: { likes, dislikes },
      userReaction: null,
    };
  }

  if (current === "like") {
    likes = clampCount(likes - 1);
  }
  if (current === "dislike") {
    dislikes = clampCount(dislikes - 1);
  }

  if (next === "like") {
    likes += 1;
  } else {
    dislikes += 1;
  }

  return {
    ...message,
    reactions: { likes, dislikes },
    userReaction: next,
  };
};

type MessagesSectionProps = {
  initialMessages?: Message[];
  currentUserName?: string;
  onReact?: (messageId: string, reaction: Reaction) => Promise<void> | void;
};

function MessageCard({
  message,
  onReact,
}: {
  message: Message;
  onReact: (messageId: string, reaction: Reaction) => void;
}) {
  const likeActive = message.userReaction === "like";
  const dislikeActive = message.userReaction === "dislike";

  return (
    <article className="rounded-xl border border-[#73aac4]/70 bg-[color:var(--surface-soft)] !p-6 shadow-[0_24px_60px_rgba(4,10,23,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between !gap-3">
        <h3 className="text-lg font-extrabold text-white sm:text-xl">
          {message.name}
        </h3>
        <span className="text-sm font-medium text-[#8694b4] sm:text-base">
          {message.time}
        </span>
      </div>
      <p className="!mt-3 text-base font-medium text-[#8694b4] sm:text-lg">
        {message.body}
      </p>
      <div className="!mt-4 flex flex-wrap items-center !gap-4 text-white sm:!gap-6">
        <button
          className={`inline-flex items-center !gap-2 text-lg font-medium transition ${
            likeActive ? "text-[#90dfed]" : "text-white"
          }`}
          type="button"
          aria-pressed={likeActive}
          onClick={() => onReact(message.id, "like")}
        >
          <span>{message.reactions.likes}</span>
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          className={`inline-flex items-center !gap-2 text-lg font-medium transition ${
            dislikeActive ? "text-[#f59e0b]" : "text-white"
          }`}
          type="button"
          aria-pressed={dislikeActive}
          onClick={() => onReact(message.id, "dislike")}
        >
          <span>{message.reactions.dislikes}</span>
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export default function MessagesSection({
  initialMessages = defaultMessages,
  currentUserName = "Fadder",
  onReact,
}: MessagesSectionProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMessage, setComposerMessage] = useState("");

  const composerDisabled = useMemo(() => {
    return composerMessage.trim().length === 0;
  }, [composerMessage]);

  const handleReact = async (messageId: string, reaction: Reaction) => {
    let finalReaction: Reaction = reaction;

    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) {
          return message;
        }
        const updated = applyReaction(message, reaction);
        finalReaction = updated.userReaction;
        return updated;
      }),
    );

    // TODO: Replace with API call when backend reactions are available.
    await onReact?.(messageId, finalReaction);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = composerMessage.trim();
    if (!body) {
      return;
    }

    const timestamp = new Date();
    const time = timestamp.toLocaleTimeString("no-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage: Message = {
      id: `${currentUserName.toLowerCase().replace(/\s+/g, "-")}-${timestamp.getTime()}`,
      name: currentUserName,
      time,
      body,
      reactions: { likes: 0, dislikes: 0 },
      userReaction: null,
    };

    setMessages((prev) => [newMessage, ...prev]);
    setComposerMessage("");
    setIsComposerOpen(false);
  };

  const handleOpenComposer = () => setIsComposerOpen(true);
  const handleCloseComposer = () => {
    setIsComposerOpen(false);
    setComposerMessage("");
  };

  return (
    <section className="!space-y-6">
      <div className="flex flex-wrap items-end justify-between !gap-4">
        <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-white sm:text-[36px]">
          Melding fra fadderne
        </h2>
        <button
          className="inline-flex items-center !gap-2 rounded-xl border border-[#73aac4] bg-[#212d49] !px-4 !py-2 text-sm font-semibold text-white transition hover:bg-[#29385a] sm:text-base"
          type="button"
          onClick={handleOpenComposer}
        >
          <Plus className="h-4 w-4" />
          Ny melding
        </button>
      </div>

      <div className="!space-y-4">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            onReact={handleReact}
          />
        ))}
      </div>

      {isComposerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center !px-4 !py-12">
          <button
            aria-label="Lukk"
            className="absolute inset-0 bg-black/60"
            type="button"
            onClick={handleCloseComposer}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#73aac4]/70 bg-[color:var(--surface-strong)] !p-6 text-white shadow-[0_40px_90px_rgba(2,6,23,0.6)] backdrop-blur sm:!p-8">
            <div className="flex items-start justify-between !gap-4">
              <div>
                <h3 className="text-xl font-semibold">Ny melding</h3>
                <p className="!mt-1 text-sm text-[#8694b4]">
                  Skriv en beskjed til faddergruppen.
                </p>
              </div>
              <button
                className="rounded-full border border-[#73aac4]/50 !px-3 !py-1 text-sm text-[#d8e6ff] transition hover:bg-white/10"
                type="button"
                onClick={handleCloseComposer}
              >
                Lukk
              </button>
            </div>

            <form className="!mt-6 !space-y-4" onSubmit={handleSubmit}>
              <label className="block !space-y-2 text-sm font-medium text-[#d8e6ff]">
                Melding
                <textarea
                  className="min-h-[140px] w-full rounded-xl border border-[#73aac4]/40 bg-[#111a2f] !px-4 !py-3 text-base text-white placeholder:text-[#5b6a8f] focus:outline-none focus:ring-2 focus:ring-[#73aac4]"
                  placeholder="Hva vil du si til gruppa?"
                  value={composerMessage}
                  onChange={(event) => setComposerMessage(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap items-center justify-end !gap-3">
                <button
                  className="rounded-xl border border-[#73aac4]/50 !px-4 !py-2 text-sm text-[#d8e6ff] transition hover:bg-white/10"
                  type="button"
                  onClick={handleCloseComposer}
                >
                  Avbryt
                </button>
                <button
                  className="rounded-xl bg-[#2c3a5d] !px-4 !py-2 text-sm font-semibold text-white transition hover:bg-[#33466f] disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={composerDisabled}
                >
                  Send melding
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
