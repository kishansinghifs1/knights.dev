import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { getSandbox } from "../utils.ts";

// Terminal Tool
export const TerminalTool = (sandboxId: string) =>
  createTool({
    name: "Terminal",
    description: "Run terminal commands inside the sandbox",
    parameters: z.object({ command: z.string() }),
    handler: async ({ command }, { step }) => {
      return step?.run("Terminal", async () => {
        const buffer = { stdout: "", stderr: "" };
        try {
          const sandbox = await getSandbox(sandboxId);
          const result = await sandbox.commands.run(command, {
            onStdout: (data) => (buffer.stdout += data),
            onStderr: (data) => (buffer.stderr += data),
          });
          return result.stdout;
        } catch (error) {
          console.error("Terminal command failed:", error, buffer);
          return `Error: ${error}\nstdout: ${buffer.stdout}\nstderr: ${buffer.stderr}`;
        }
      });
    },
  });

// Create or Update Files Tool
export const CreateOrUpdateFilesTool = (sandboxId: string) =>
  createTool({
    name: "CreateOrUpdateFiles",
    description: "Create or update files in the sandbox",
    parameters: z.object({
      files: z.array(
        z.object({
          path: z.string(),
          content: z.string(),
        })
      ),
    }),
    handler: async ({ files }, { step, network }) => {
      return step?.run("CreateOrUpdateFiles", async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          const updatedFiles = { ...(network.state.data.files || {}) };
          for (const file of files) {
            await sandbox.files.write(file.path, file.content);
            updatedFiles[file.path] = file.content;
          }
          network.state.data.files = updatedFiles;
          return updatedFiles;
        } catch (error) {
          console.error("File update failed:", error);
          return `Error: ${error}`;
        }
      });
    },
  });

// Read Files Tool
export const ReadFilesTool = (sandboxId: string) =>
  createTool({
    name: "ReadFiles",
    description: "Read files from the sandbox",
    parameters: z.object({
      files: z.array(z.object({ path: z.string() })),
    }),
    handler: async ({ files }, { step }) => {
      return step?.run("ReadFiles", async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          const contents = await Promise.all(
            files.map(async (f) => ({
              path: f.path,
              content: await sandbox.files.read(f.path),
            }))
          );
          return JSON.stringify(contents, null, 2);
        } catch (error) {
          console.error("File read failed:", error);
          return `Error: ${error}`;
        }
      });
    },
  });
