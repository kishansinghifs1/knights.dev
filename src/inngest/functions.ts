import { inngest } from "./client";
import { createAgent, gemini } from "@inngest/agent-kit";

import {Sandbox} from "@e2b/code-interpreter"
import { stepsSchemas } from "inngest/api/schema";
import { getSandbox } from "./utils";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event , step }) => {

    const sandboxId = await step.run("get-sandbox-id" , async () => {
      const sandbox = Sandbox.create("knights-nextjs-test3")
      return   (await sandbox).sandboxId
    })
    // Create a production-grade AI coding agent
    const writer = createAgent({
      name: "writer",
      system: `
You are a world-class senior software engineer specializing in Next.js (App Router), React, and TypeScript. 
Your job is to generate **production-ready, bug-free, fully functional code** that works on first execution.
You follow the highest engineering standards, including:
- Next.js 14+ with App Router, Server Components, Route Handlers, Server Actions
- React 18+ hooks, context, state management (Zustand/Redux/Context API)
- TypeScript with strict mode (no implicit any, fully typed props, state, and APIs)
- SOLID principles, clean architecture, and modular file structure
- Performance optimizations (React.memo, useMemo, useCallback)
- Proper error boundaries and fallback UI
- Accessibility (WCAG 2.1) and responsive design with semantic HTML
- SEO-friendly and security-compliant (avoid XSS, CSRF, unsafe APIs)

Rules:
1. Always provide fully working, copy-paste-ready code with all imports.
2. Do NOT leave placeholders like "add your logic here".
3. Include comments to explain critical logic.
4. Handle edge cases, errors, and loading states.
5. Suggest improvements only if they do not block execution.
6. If the project is large, provide a **modular starting point with folder structure** and explain how to extend it.

Never skip types, and never assume undefined variables.
      `,
      model: gemini({
        model: "gemini-2.0-flash",
        apiKey: process.env.GEMINI_API_KEY,
        defaultParameters: {
          generationConfig: { 
            temperature: 0.2, // Lowered for accuracy
            maxOutputTokens: 4000 // Prevent truncation
          },
        },
      }),
    });

    // Stronger runtime prompt for reliable output
    const { output } = await writer.run(`
Generate production-grade Next.js + React + TypeScript code based on this project description:

---
${event.data.value}
---

### Requirements:
- Code must compile without errors using \`tsc --noEmit\`.
- Include imports, types, folder structure, and comments.
- Implement error handling, loading states, and fallback UI.
- Follow best practices for scalability and maintainability.
- If APIs are mentioned, create mock endpoints using Next.js Route Handlers.
- Use Tailwind CSS if styling is needed.

Return ONLY the complete code (and folder structure if needed) — no unnecessary explanations.
    `);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId)
      const host = sandbox.getHost(3000);
      return `http://${host}`
    });

    return { message: output, sandboxUrl };
  },
);
