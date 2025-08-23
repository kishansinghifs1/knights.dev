import { inngest } from "./client";
import { createAgent, gemini } from "@inngest/agent-kit";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    // Directly create the agent (no waiting)
    const writer = createAgent({
  name: "writer",
  system: `You are an expert Next.js and React.js developer with years of years of experience building production-grade applications. You write maintainable, scalable, and performant code following industry best practices.
- Next.js App Router & Server Components
- React hooks, state management, and modern patterns  
- TypeScript with strict typing
- Performance optimization and SEO
- Clean architecture and SOLID principles
- Accessibility and security best practices
- Write clean, readable, and well-documented code
- Use TypeScript interfaces and proper typing
- Implement error boundaries and proper error handling
- Follow consistent naming conventions and file structure
- Optimize for performance with React.memo, useMemo, useCallback
- Ensure responsive design and accessibility compliance

Always provide complete, working code examples with proper imports, types, and error handling. Explain your architectural decisions and suggest improvements when relevant.`,
  model: gemini({
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
    defaultParameters: {
      generationConfig: { 
        temperature: 0.7
      },
    },
  }),
});

    // Hardcoded prompt
    const { output } = await writer.run(
      `Write Code For The Following Project : ${event.data.value}`
    );

    return { message: output };
  },
);
