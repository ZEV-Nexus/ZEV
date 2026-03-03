'use client"';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";

import rehypeSanitize from "rehype-sanitize";

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex, rehypeSlug]}
      components={{
        ol: ({ children }) => (
          <ol className="list-decimal list-inside my-4 space-y-2">
            {children}
          </ol>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
