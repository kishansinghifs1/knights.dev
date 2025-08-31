"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessageContainer } from "../components/message-container";
import { Suspense, useState } from "react";
import { Fragment } from "@/generated/prisma";
import { ProjectHeader } from "../components/project-header";

interface Props {
  projectId: string;
}

export const ProjectView = ({ projectId }: Props) => {
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);

  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          className="flex flex-col min-h-0"
        >
           <Suspense fallback={<div>Loading project...</div>}>
             <ProjectHeader projectId={projectId} />
           </Suspense>
          <Suspense fallback={<div>Loading messages...</div>}>
            <MessageContainer projectId={projectId} activeFragment={activeFragment} setActiveFragment={setActiveFragment} />
          </Suspense>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          defaultSize={65}
          minSize={50}
          className="flex flex-col min-h-0"
        >
          TODO:PREVIEW
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
