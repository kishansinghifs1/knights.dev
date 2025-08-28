import prisma from "@/lib/db";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { z } from "zod"
import {inngest} from "@/inngest/client";

export const messagesRouter = createTRPCRouter({
  getMany : baseProcedure
    .query(async () => {
      const messages = await prisma.message.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include : {
          fragments  : true
        }
      });
      return messages;
    }),
  create: baseProcedure
    .input(
      z.object({
        value: z.string().min(1, { message: "Message content is required." }),
      })
    )
    .mutation(async ({ input }) => {
      const newMessage = await prisma.message.create({
        data: {
          content: input.value,
          role: "USER",
          type: "RESULT",
        },
      });
      await inngest.send({
        name: "knight/run",
        data: {
          value: input.value,
        },
      });
      return newMessage;
    }),
});
