"use client";

import { cn } from "@/lib/cn";
import { AgentIcon } from "./agent-icon";
import type { Agent } from "@/lib/types";

export interface AgentBadgeProps {
  agent: Agent;
  className?: string;
}

export function AgentBadge({ agent, className }: AgentBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-val-dark-alt px-2 py-1",
        className
      )}
    >
      <AgentIcon agent={agent} size="sm" />
      <span className="text-sm font-medium text-val-light">
        {agent.nameJa}
      </span>
    </div>
  );
}
