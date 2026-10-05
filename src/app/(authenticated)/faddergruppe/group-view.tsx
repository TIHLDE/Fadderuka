"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "~/components/ui/empty";
import { Field, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
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
      toast("Melding sendt");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = api.gruppe.deleteMessage.useMutation({
    onSuccess: () => {
      void utils.gruppe.getMessages.invalidate({ gruppeId, channel });
      toast("Melding slettet");
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
    if (days === 1) return "I går";
    if (days < 7) return `${days} dager siden`;
    return new Date(date).toLocaleDateString("no-NO", {
      day: "numeric",
      month: "short",
    });
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setComposerMessage("");
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="min-w-0 text-2xl">{title}</h2>
        {canPost && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsComposerOpen(true)}
          >
            <Plus />
            {composerTitle}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="size-6" />
        </div>
      ) : messages && messages.length > 0 ? (
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <Card key={message.id} render={<article />}>
              <CardHeader>
                <CardTitle>{message.author.name}</CardTitle>
                <CardAction className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">
                    {formatTime(message.createdAt)}
                  </span>
                  {message.author.name === currentUserName && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Slett melding"
                      title="Slett melding"
                      onClick={() =>
                        deleteMutation.mutate({ messageId: message.id })
                      }
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{message.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <Dialog
        open={isComposerOpen}
        onOpenChange={(open) => {
          if (!open) closeComposer();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{composerTitle}</DialogTitle>
            <DialogDescription>{composerSubtitle}</DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor={`melding-${channel}`}>Melding</FieldLabel>
              <Textarea
                id={`melding-${channel}`}
                className="min-h-36"
                placeholder={composerPlaceholder}
                value={composerMessage}
                onChange={(e) => setComposerMessage(e.target.value)}
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeComposer}>
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={
                  composerMessage.trim().length === 0 || postMutation.isPending
                }
              >
                {postMutation.isPending ? "Sender..." : "Send melding"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
