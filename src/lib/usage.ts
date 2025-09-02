import { RateLimiterPrisma } from "rate-limiter-flexible";

import  prisma  from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const FREE_POINTS = 150;
const PRO_POINTS = 300000;
const Duration = 30 * 24 * 60 * 60;
const Generation_Cost = 1;

export async function getUsageTracker() {

  const {has} = await auth();
  const hasPremiumAccess = has({plan:"pro"});

  const UsageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: "Usage",
    points:hasPremiumAccess ? PRO_POINTS :  FREE_POINTS,
    duration: Duration,
  });
  return UsageTracker;
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, Generation_Cost);
  return result;
}


export async function getUsageStatus(){
    const {userId} = await auth();
    if(!userId){
        throw new Error("user not defined");
    }
    const usageTracker =await getUsageTracker();
    const result=await usageTracker.get(userId);
    return result;
}