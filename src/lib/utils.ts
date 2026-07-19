import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

export function leftPad(value: number | string, length: number, padChar = "0") {
  return String(value).padStart(length, padChar);
}

/**
 * Strip common Markdown syntax to plain text for short previews
 * (line-clamped lists, admin tables) where rendered Markdown doesn't fit.
 */
export function stripMarkdown(input: string): string {
  return input
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^\s{0,3}>\s?/gm, "") // blockquotes
    .replace(/^\s*[-*+]\s+/gm, "") // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, "") // ordered list markers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/__(.+?)__/g, "$1") // bold
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "$1") // italic *
    .replace(/(?<!_)_(?!_)(.+?)_(?!_)/g, "$1") // italic _
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/!?\[(.*?)\]\((.*?)\)/g, "$1") // links / images -> text
    .replace(/^\s*([-*_]\s*){3,}$/gm, "") // horizontal rules
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

export const weekDays = [
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
  "Søndag",
];
