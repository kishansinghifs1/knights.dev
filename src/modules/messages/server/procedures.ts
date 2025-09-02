import prisma from "@/lib/db";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";
import { consumeCredits } from "@/lib/usage";

export const messagesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID is required." }),
      })
    )
    .query(async ({ input , ctx }) => {
      const messages = await prisma.message.findMany({
        where: { projectId: input.projectId , project : {
          userId :ctx.auth.userId,
        }},
        orderBy: {
          createdAt: "asc",
        },
        include: {
          fragments: true,
        },
      });
      return messages;
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Message content is required." })
          .max(1000, {
            message: "Message content must be at most 1000 characters long.",
          }),
        projectId: z.string().min(1, { message: "Project ID is required." }),
      })
    )
    .mutation(async ({ input , ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where:{
          id:input.projectId,
          userId : ctx.auth.userId
        }
      })
      
      if(!existingProject){
        throw new TRPCError({code:"NOT_FOUND",message:"Project not found"})
      }

      try {
        await consumeCredits()
      } catch (error) {
        if(error instanceof Error){
          throw new TRPCError({code:"BAD_REQUEST",message:"Something went wrong"})
        }else{
          throw new TRPCError({
            code :"TOO_MANY_REQUESTS",
            message:"Ran Out Of Credit"
          })
        }
      }
      

      const newMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.value,
          role: "USER",
          type: "RESULT",
        },
      });
      await inngest.send({
        name: "knight/run",
        data: {
          value: input.value,
          projectId: input.projectId,
        },
      });
      return newMessage;
    }),
});
