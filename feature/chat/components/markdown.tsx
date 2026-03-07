"use client";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Checkbox } from "@/shared/shadcn/components/ui/checkbox";
import { Separator } from "@/shared/shadcn/components/ui/separator";

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-2 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-2 mb-0.5">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mt-1.5 mb-0.5">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold mt-1 mb-0.5">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-semibold mt-1 mb-0.5">{children}</h6>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="leading-relaxed [&:not(:first-child)]:mt-1">{children}</p>
  ),

  // Bold / Italic / Strikethrough
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 pl-3 my-1.5 text-muted-foreground italic">
      {children}
    </blockquote>
  ),

  // Inline code & code blocks
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      const lang = className?.replace("language-", "") || "";
      return (
        <div className="relative my-1.5">
          {lang && (
            <span className="absolute top-2 right-2 text-xs text-muted-foreground/60 select-none">
              {lang}
            </span>
          )}
          <pre className="bg-muted/50 rounded-lg p-3 overflow-x-auto text-sm">
            <code className={className}>{children}</code>
          </pre>
        </div>
      );
    }
    return (
      <code className="bg-muted/50 rounded px-1.5 py-0.5 text-sm font-mono text-primary">
        {children}
      </code>
    );
  },

  // Pre (fallback wrapper for code blocks)
  pre: ({ children }) => <>{children}</>,

  // Horizontal rule — shadcn Separator
  hr: () => <Separator className="my-2" />,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all"
    >
      {children}
    </a>
  ),
  br: () => <br />,
  // Images
  img: ({ src, alt }) => (
    <img
      src={src ?? ""}
      alt={alt || ""}
      className="max-w-full rounded-lg my-1.5"
      loading="lazy"
    />
  ),

  // Table — shadcn Table components
  table: ({ children }) => (
    <div className="my-1.5 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="[&_tr]:border-b bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-border transition-colors hover:bg-muted/50">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="h-8 px-2 text-left align-middle font-medium text-foreground whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="p-2 align-middle">{children}</td>,

  // Task list checkbox — shadcn Checkbox
  input: ({ checked, type }) => {
    if (type === "checkbox") {
      return (
        <Checkbox
          checked={checked}
          className="mr-1.5 inline-flex align-middle pointer-events-none"
        />
      );
    }
    return <input type={type} />;
  },
};

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex, rehypeSlug]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
