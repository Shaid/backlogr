"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: (props) => <h1 className="text-lg font-semibold mt-4 mb-2" {...props} />,
  h2: (props) => <h2 className="text-base font-semibold mt-3 mb-1.5" {...props} />,
  h3: (props) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
  p: (props) => <p className="text-sm leading-relaxed mb-2 last:mb-0" {...props} />,
  a: (props) => (
    <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  ul: (props) => <ul className="text-sm list-disc pl-5 mb-2 space-y-0.5" {...props} />,
  ol: (props) => <ol className="text-sm list-decimal pl-5 mb-2 space-y-0.5" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-sm text-muted-foreground italic" {...props} />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`${className ?? ""} text-xs`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: (props) => (
    <pre className="bg-muted rounded-lg p-3 overflow-x-auto mb-2 text-xs" {...props} />
  ),
  table: (props) => (
    <div className="overflow-x-auto mb-2">
      <table className="text-sm w-full border-collapse" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border border-border px-3 py-1.5 text-left font-medium bg-muted/50" {...props} />
  ),
  td: (props) => <td className="border border-border px-3 py-1.5" {...props} />,
  hr: () => <hr className="border-border my-3" />,
  img: (props) => <img className="rounded-lg max-w-full" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
