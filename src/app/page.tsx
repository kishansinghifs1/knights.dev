"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTRPC } from "@/trpc/client"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

const Page =  () => {
   const [value ,setValue] = useState("")
    const trpc = useTRPC()
    const invoke = useMutation(trpc.invoke.mutationOptions({
      onSuccess : () => {
        toast.success("Background task invoked successfully!")
      }
    }))
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Input placeholder="Type your message here..." value={value} onChange={(e) => setValue(e.target.value)} />
      <Button disabled={invoke.isPending}
        onClick={() => {
          invoke.mutate({ value: value })
        }}
      >
        Invoked background task
      </Button>
    </div>
  )
}
 
export default Page
