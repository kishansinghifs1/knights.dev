import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox } from "../utils";


// Create a new sandbox
export const createSandbox = async (step: any) => {
  return step.run("get-sandbox-id", async () => {
    const sandbox = await Sandbox.create("knights-nextjs-test3");
    return sandbox.sandboxId;
  });
};

// Get sandbox URL
export const getSandboxUrl = async (sandboxId: string, step: any) => {
  return step.run("get-sandbox-url", async () => {
    const sandbox = await getSandbox(sandboxId);
    return `http://${sandbox.getHost(3000)}`;
  });
};
