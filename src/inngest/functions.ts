import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    //this is a download step
    await step.sleep("wait-a-moment", "30s");
    //this is transcription step
    await step.sleep("transcribe-audio", "20s");
    //this is a final step
    await step.sleep("final-step", "10s");
    return { message: `Hello ${event.data.email}!` };
  },
);