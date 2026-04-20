import React from "react";

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function isBulletLine(line: string) {
  return /^([-*•]|\d+\.)\s+/.test(line);
}

function stripBulletPrefix(line: string) {
  return stripMarkdown(line.replace(/^([-*•]|\d+\.)\s+/, "").trim());
}

function isSectionTitle(line: string) {
  if (!line) return false;
  if (isBulletLine(line)) return false;
  if (line.length > 72) return false;
  return line.endsWith(":");
}

function splitIntoSentenceBullets(text: string) {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/\s*;\s*/g, ". ")
    .trim();

  const parts = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;
  if (normalized.length < 110) return null;

  return parts;
}

export function FormattedAIText({ text }: { text: string }) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line.trim()))
    .filter((line, index, array) => !(line === "" && array[index - 1] === ""));

  const blocks: Array<
    | { type: "section"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
  > = [];

  for (const line of lines) {
    if (!line) continue;

    if (isBulletLine(line)) {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.type === "list") {
        lastBlock.items.push(stripBulletPrefix(line));
      } else {
        blocks.push({ type: "list", items: [stripBulletPrefix(line)] });
      }
      continue;
    }

    if (isSectionTitle(line)) {
      blocks.push({ type: "section", text: line.replace(/:$/, "") });
      continue;
    }

    const sentenceBullets = splitIntoSentenceBullets(line);
    if (sentenceBullets) {
      blocks.push({ type: "list", items: sentenceBullets });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "section") {
          return (
            <div key={`section_${index}`} className="text-xs font-semibold uppercase tracking-wider text-gh-blue">
              {block.text}
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list_${index}`} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <li key={`item_${itemIndex}`} className="flex items-start gap-2 text-sm text-gh-text leading-relaxed">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-gh-blue shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph_${index}`} className="text-sm text-gh-text leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
