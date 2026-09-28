"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "~/lib/utils";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-foreground mt-4 text-2xl font-bold first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-foreground mt-4 text-xl font-bold first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-foreground mt-4 text-lg font-semibold first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 underline underline-offset-2 transition"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-foreground/20 my-3 border-l-2 pl-4 italic first:mt-0 last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-foreground/10 rounded px-1.5 py-0.5 font-mono text-sm">
      {children}
    </code>
  ),
  hr: () => <hr className="border-foreground/15 my-4" />,
};

export default function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("leading-relaxed", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
