"use client";

import Prism from "prismjs";
import { useEffect, useRef } from "react";
import "prismjs/components/prism-clike"; // base dependency
import "prismjs/components/prism-markup"; // needed for JSX/TSX
import "./code-theme.css";

interface Props {
  code: string;
  lang: string;
}

export const CodeView = ({ code, lang }: Props) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function loadLanguage() {
      switch (lang) {
        case "ts":
        case "tsx":
          // Load JavaScript first (dependency for TS & TSX)
          await import("prismjs/components/prism-javascript");
          await import("prismjs/components/prism-typescript");
          await import("prismjs/components/prism-jsx"); // Required before TSX
          await import("prismjs/components/prism-tsx");
          break;

        case "js":
        case "jsx":
          await import("prismjs/components/prism-javascript");
          await import("prismjs/components/prism-jsx");
          break;

        case "json":
          await import("prismjs/components/prism-json");
          break;

        default:
          break;
      }

      if (codeRef.current) {
        Prism.highlightElement(codeRef.current);
      }
    }

    loadLanguage();
  }, [code, lang]);

  return (
    <pre className="p-2 bg-transparent border-none rounded-none m-0 text-xs">
      <code ref={codeRef} className={`language-${lang}`}>
        {code}
      </code>
    </pre>
  );
};
