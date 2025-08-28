"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const Page = () => {
  const [value, setValue] = useState("");
  const trpc = useTRPC();
  const { data: messages } = useQuery(trpc.messages.getMany.queryOptions());
  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        toast.success("Message sent successfully!");
      },
    })
  );
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Input
        placeholder="Type your message here..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        disabled={createMessage.isPending}
        onClick={() => {
          createMessage.mutate({ value: value });
        }}
      >
        Send Message
      </Button>
      {JSON.stringify(messages, null, 2)}
    </div>
  );
};

export default Page;
