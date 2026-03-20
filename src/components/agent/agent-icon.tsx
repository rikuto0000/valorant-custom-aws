"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Agent, AgentRole } from "@/lib/types";

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
} as const;

const roleBorderColors: Record<AgentRole, string> = {
  Duelist: "border-role-duelist",
  Initiator: "border-role-initiator",
  Controller: "border-role-controller",
  Sentinel: "border-role-sentinel",
};

export interface AgentIconProps {
  agent: Agent;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AgentIcon({ agent, size = "md", className }: AgentIconProps) {
  const px = sizeMap[size];
  const borderColor = roleBorderColors[agent.role];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border-2",
        borderColor,
        className
      )}
      style={{ width: px, height: px }}
    >
      <Image
        src={agent.image}
        alt={agent.nameJa}
        width={px}
        height={px}
        className="object-cover"
      />
    </div>
  );
}
