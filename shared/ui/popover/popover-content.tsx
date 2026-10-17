"use client"

import * as Popover from "@radix-ui/react-popover"
import { cn } from "@/shared/lib/cn"
import { PopoverContentProps } from "./popover.types"

export function PopoverContent({
  side = "bottom",
  align = "start",
  offset = 6,
  className,
  children,
}: PopoverContentProps) {
  return (
    <Popover.Content
      side={side}
      align={align}
      sideOffset={offset}
      className={cn(
        `
        z-[900]
        min-w-[180px]
        rounded-md
        border
        border-stroke-strong
        bg-white/95
        text-text-primary
        shadow-lg
        outline-none
        `,
        className
      )}
    >
      {children}
    </Popover.Content>
  )
}
