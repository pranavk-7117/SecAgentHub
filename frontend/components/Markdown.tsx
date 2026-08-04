import React from "react";

export function Markdown({ content }: { content: string }) {
  if (!content) return null;

  // Split by triple backticks to separate code blocks
  const parts = content.split("```");
  
  return (
    <div className="space-y-4 text-slate-800 leading-relaxed text-sm">
      {parts.map((part, index) => {
        // Every odd index is a code block
        if (index % 2 === 1) {
          const lines = part.split("\n");
          const language = lines[0]?.trim() || "";
          const code = lines.slice(1).join("\n").trim();
          return (
            <div key={index} className="my-4 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
              {language && (
                <div className="bg-slate-100 px-4 py-1.5 text-xs font-mono text-slate-600 border-b border-slate-200 flex justify-between items-center">
                  <span>{language}</span>
                </div>
              )}
              <pre className="bg-slate-950 p-4 overflow-x-auto text-xs font-mono text-slate-100 whitespace-pre leading-5">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Even index is regular markdown text
        return (
          <div key={index} className="space-y-3">
            {part.split("\n\n").map((block, blockIdx) => {
              const trimmedBlock = block.trim();
              if (!trimmedBlock) return null;

              // Check if heading
              if (trimmedBlock.startsWith("### ")) {
                return (
                  <h4 key={blockIdx} className="text-base font-semibold text-slate-900 mt-4 mb-2">
                    {renderInlineMarkdown(trimmedBlock.slice(4))}
                  </h4>
                );
              }
              if (trimmedBlock.startsWith("## ")) {
                return (
                  <h3 key={blockIdx} className="text-lg font-bold text-slate-950 mt-5 mb-3 border-b border-slate-100 pb-1">
                    {renderInlineMarkdown(trimmedBlock.slice(3))}
                  </h3>
                );
              }
              if (trimmedBlock.startsWith("# ")) {
                return (
                  <h2 key={blockIdx} className="text-xl font-extrabold text-slate-950 mt-6 mb-4">
                    {renderInlineMarkdown(trimmedBlock.slice(2))}
                  </h2>
                );
              }

              // Check if list block
              if (trimmedBlock.startsWith("- ") || trimmedBlock.startsWith("* ") || /^\d+\.\s/.test(trimmedBlock)) {
                const items = trimmedBlock.split("\n");
                const isOrdered = /^\d+\.\s/.test(trimmedBlock);
                const ListTag = isOrdered ? "ol" : "ul";
                
                return (
                  <ListTag key={blockIdx} className={`space-y-1.5 pl-5 my-3 ${isOrdered ? "list-decimal animate-fadeIn" : "list-disc animate-fadeIn"}`}>
                    {items.map((item, itemIdx) => {
                      const cleanItem = isOrdered 
                        ? item.replace(/^\d+\.\s/, "") 
                        : item.replace(/^[-*]\s/, "");
                      return (
                        <li key={itemIdx} className="text-slate-700">
                          {renderInlineMarkdown(cleanItem)}
                        </li>
                      );
                    })}
                  </ListTag>
                );
              }

              // Otherwise render as paragraph
              return (
                <p key={blockIdx} className="text-slate-700 leading-relaxed">
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
  // Replace bold (**text**) and code (`code`) inline
  // Split by bold markers first
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  
  return boldParts.map((part, idx) => {
    // Every odd index is bold text
    const isBold = idx % 2 === 1;
    
    // Now split by inline code backticks
    const codeParts = part.split(/`([^`]+)`/g);
    
    const rendered = codeParts.map((subPart, subIdx) => {
      const isCode = subIdx % 2 === 1;
      if (isCode) {
        return (
          <code key={subIdx} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-teal-800 text-[13px] font-mono font-medium">
            {subPart}
          </code>
        );
      }
      return subPart;
    });

    if (isBold) {
      return <strong key={idx} className="font-semibold text-slate-950">{rendered}</strong>;
    }
    return <span key={idx}>{rendered}</span>;
  });
}
