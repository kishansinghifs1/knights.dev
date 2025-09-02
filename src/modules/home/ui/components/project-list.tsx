"use client"

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";

export const ProjectsList = () => {
  const trpc = useTRPC();
  const {user} = useUser();
  const { data: projects } = useQuery(trpc.projects.getMany.queryOptions());
  if(!user){
    return null;
  }

  return (
    <div className="w-full bg-white dark:bg-sidebar rounded-xl p-6 border flex flex-col gap-y-4 sm:gap-y-3">
      <h2 className="text-xl font-semibold">{user?.firstName}&apos;s Saved Projects</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {projects?.length === 0 && (
          <div className="col-span-full text-center">
            <p className="text-sm text-muted-foreground">No projects found</p>
          </div>
        )}
        {projects?.map((project) => (
          <Button
            key={project.id}
            variant="outline"
            className="font-normal h-auto justify-start w-full text-start p-3"
            asChild
          >
            <Link href={`/projects/${project.id}`}>
              <div className="flex items-center gap-x-3">
                <Image
                  src="/logo.svg"
                  alt="Vibe"
                  width={28}
                  height={28}
                  className="object-contain"
                />
                <div className="flex flex-col leading-tight">
                  <h3 className="truncate font-medium">{project.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(project.updatedAt, {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
};
