import { getQueryClient ,  trpc } from "@/trpc/server"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { Client } from "./client"
import { Suspense } from "react"

const page = async () => {
    const queryClient = getQueryClient()
    await queryClient.prefetchQuery(trpc.hello.queryOptions({text: "hello knight.devs"}))
  return (
    <div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<div>Loading...</div>}>
            <Client />
        </Suspense>
      </HydrationBoundary>
    </div>
  )
}
 
export default page
