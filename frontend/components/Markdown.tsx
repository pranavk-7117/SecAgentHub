import React from "react";

export function Markdown({ content }: { content: string }) {
  if (!content) return null;

  // Split by triple backticks to separate code blocks
  const parts = content.split("```");

  return (
    <div className="space-y-3 text-slate-300 leading-relaxed text-sm">
      {parts.map((part, index) => {
        // Every odd index is a code block
        if (index % 2 === 1) {
          const lines = part.split("\n");
          const language = lines[0]?.trim() || "";
          const code = lines.slice(1).join("\n").trim();
          return (
            <div key={index} className="my-3 rounded-xl overflow-hidden border border-white/[0.07] shadow-lg">
              {language && (
                <div className="bg-white/[0.04] px-4 py-1.5 text-xs font-mono text-slate-400 border-b border-white/[0.06] flex justify-between items-center">
                  <span>{language}</span>
                </div>
              )}
              <pre className="bg-[#0a0d13] p-4 overflow-x-auto text-xs font-mono text-teal-300 whitespace-pre leading-5">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Even index is regular markdown text
        return (
          <div key={index} className="space-y-2.5">
            {part.split("\n\n").map((block, blockIdx) => {
              const trimmedBlock = block.trim();
              if (!trimmedBlock) return null;

              if (trimmedBlock.startsWith("### ")) {
                return (
                  <h4 key={blockIdx} className="text-sm font-bold text-white mt-3 mb-1">
                    {renderInlineMarkdown(trimmedBlock.slice(4))}
                  </h4>
                );
              }
              if (trimmedBlock.startsWith("## ")) {
                return (
                  <h3 key={blockIdx} className="text-base font-bold text-white mt-4 mb-2 border-b border-white/[0.06] pb-1">
                    {renderInlineMarkdown(trimmedBlock.slice(3))}
                  </h3>
                );
              }
              if (trimmedBlock.startsWith("# ")) {
                return (
                  <h2 key={blockIdx} className="text-lg font-extrabold text-white mt-4 mb-3">
                    {renderInlineMarkdown(trimmedBlock.slice(2))}
                  </h2>
                );
              }

              if (trimmedBlock.startsWith("- ") || trimmedBlock.startsWith("* ") || /^\d+\.\s/.test(trimmedBlock)) {
                const items = trimmedBlock.split("\n");
                const isOrdered = /^\d+\.\s/.test(trimmedBlock);
                const ListTag = isOrdered ? "ol" : "ul";

                return (
                  <ListTag key={blockIdx} className={`space-y-1.5 pl-5 my-2 ${isOrdered ? "list-decimal" : "list-disc"}`}>
                    {items.map((item, itemIdx) => {
                      const cleanItem = isOrdered
                        ? item.replace(/^\d+\.\s/, "")
                        : item.replace(/^[-*]\s/, "");
                      if (!cleanItem.trim()) return null;
                      return (
                        <li key={itemIdx} className="text-slate-300">
                          {renderInlineMarkdown(cleanItem)}
                        </li>
                      );
                    })}
                  </ListTag>
                );
              }

              return (
                <p key={blockIdx} className="text-slate-300 leading-relaxed">
                  {renderInlineMarkdown(trimmedBlock)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);

  return boldParts.map((part, idx) => {
    const isBold = idx % 2 === 1;
    const codeParts = part.split(/`([^`]+)`/g);

    const rendered = codeParts.map((subPart, subIdx) => {
      const isCode = subIdx % 2 === 1;
      if (isCode) {
        return (
          <code key={subIdx} className="px-1.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[12px] font-mono font-medium">
            {subPart}
          </code>
        );
      }
      return subPart;
    });

    if (isBold) {
      return <strong key={idx} className="font-semibold text-white">{rendered}</strong>;
    }
    return <span key={idx}>{rendered}</span>;
  });
}
