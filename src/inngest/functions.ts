import { inngest } from "./client";
import {
  createAgent,
  createNetwork,
  createTool,
  gemini,
  Tool,
} from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantMessage } from "./utils";
import { z } from "zod";
import prisma from "@/lib/db";
import { dev_prompt } from "@/prompt/prompt";
import { default_port, sandbox_template } from "./static";

interface AgentState {
  summary: string;
  files: { [path: string]: string };
  
}

export const knightFunction = inngest.createFunction(
  { id: "knight" },
  { event: "knight/run" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create(sandbox_template);
      return sandbox.sandboxId;
    });

    // Create a production-grade AI coding agent
    const knight = createAgent<AgentState>({
      name: "knight",
      system: dev_prompt,
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        defaultParameters: {
          generationConfig: {
            temperature: 0.2, // Lowered for accuracy
            maxOutputTokens: 4000, // Prevent truncation
          },
        },
      }),
      tools: [
        createTool({
          name: "Terminal",
          description: "A tool for interacting with the terminal",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("Terminal", async () => {
              const buffer = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffer.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffer.stderr += data;
                  },
                });
                return result.stdout;
              } catch (error) {
                console.error(
                  `command failed: ${error} \nstdout : ${buffer.stdout} \nstderr : ${buffer.stderr}`
                );
                return `command failed: ${error} \nstdout : ${buffer.stdout} \nstderr : ${buffer.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }),
          handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
            const newFiles = await step?.run(
              "createOrUpdateFiles",
              async () => {
                try {
                  const updatedFiles = network.state.data.files || {};
                  const sandbox = await getSandbox(sandboxId);
                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }
                  return updatedFiles;
                } catch (error) {
                  return "Error: " + error;
                }
              }
            );

            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "read files from the sandbox",
          parameters : z.object({
            files: z.array(
              z.object({
                path: z.string(),
              })
            ),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file.path);
                  contents.push({ path: file.path, content });
                }
                return JSON.stringify(contents, null, 2);
              } catch (error) {
                return "Error: " + error;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          // Handle the response from the tools
          const lastAssistantText = lastAssistantMessage(result);
          if (lastAssistantText && network) {
            // Do something with the last assistant message
            if (lastAssistantText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: "code-agency",
      agents: [knight],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return knight;
      },
    });

    const result = await network.run(event.data.value);

    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(default_port);
      return `http://${host}`;
    });

    // Save results to database
    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            content: "something went wrong",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }
      return prisma.message.create({
        data: {
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          fragments: {
            create: {
              sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            },
          },
        },
      });
    });

    // Return final result
    return {
      url: sandboxUrl,
      title: "fragment",
      files: result.state.data.files || {},
      summary: result.state.data.summary || "",
    };
  }
);
