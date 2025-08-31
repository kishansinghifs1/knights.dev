"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/dist/client/components/navigation";

const Page = () => {
  const router = useRouter();
  
  const [value, setValue] = useState("");
  const trpc = useTRPC();
  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Message sent successfully!");
        router.push(`/projects/${data.id}`);
        setValue("");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send message");
      },
    })
  );
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="max-w-7xl mx-auto flex items-center flex-col gap-y-4 justify-center">
        <Input
          placeholder="Type your message here..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          disabled={createProject.isPending}
          onClick={() => {
            createProject.mutate({ value: value });
          }}
        >
          Send Message
        </Button>
      </div>
    </div>
  );
};

export default Page;
