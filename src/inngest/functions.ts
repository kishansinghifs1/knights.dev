import { inngest } from "./client";
import { createAgent, createNetwork, gemini } from "@inngest/agent-kit";
import prisma from "@/lib/db";
import { dev_prompt } from "@/prompt/prompt";
import { lastAssistantMessage } from "./utils";
import { createSandbox, getSandboxUrl } from "./helpersfunctions/helpers";
import {
  TerminalTool,
  CreateOrUpdateFilesTool,
  ReadFilesTool,
} from "./tools/tools";

interface AgentState {
  summary: string;
  files: Record<string, string>;
}

export const knightFunction = inngest.createFunction(
  { id: "knight" },
  { event: "knight/run" },
  async ({ event, step }) => {
    // 1. Create sandbox
    const sandboxId = await createSandbox(step);

    // 2. Create agent
    const knight = createAgent<AgentState>({
      name: "knight",
      system: dev_prompt,
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        defaultParameters: {
          generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
        },
      }),
      tools: [
        TerminalTool(sandboxId),
        CreateOrUpdateFilesTool(sandboxId),
        ReadFilesTool(sandboxId),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const text = lastAssistantMessage(result);
          if (text && network) {
            if (text?.includes("<task_summary>"))
              network.state.data.summary = text;
          }
          return result;
        },
      },
    });

    // 3. Create network
    const network = createNetwork<AgentState>({
      name: "code-agency",
      agents: [knight],
      maxIter: 15,
      router: async ({ network }) =>
        network.state.data.summary ? undefined : knight,
    });

    // 4. Run agent
    const result = await network.run(event.data.value);

    // 5. Generate sandbox URL
    const sandboxUrl = await getSandboxUrl(sandboxId, step);

    // 6. Save results to DB
    const hasError =
      !result.state.data.summary &&
      (!result.state.data.files ||
        Object.keys(result.state.data.files).length === 0);

    await step.run("save-result", async () => {
      if (hasError) {
        return await prisma.message.create({
          data: {
            role: "ASSISTANT",
            type: "ERROR",
            content: "An error occurred while processing your request.",
            projectId: event.data.projectId,
          },
        });
      } else {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: result.state.data.summary,
            role: "ASSISTANT",
            type: "RESULT",
            fragments: {
              create: {
                sandboxUrl: sandboxUrl,
                title: "fragment",
                files: JSON.parse(
                  JSON.stringify(result.state.data?.files ?? {})
                ),
              },
            },
          },
        });
      }
    });

    return {
      url: sandboxUrl,
      title: "fragment",
      files: result.state.data.files || {},
      summary: result.state.data.summary || "",
    };
  }
);
