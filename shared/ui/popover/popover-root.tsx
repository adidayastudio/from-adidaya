"use client";

import * as Popover from "@radix-ui/react-popover";
import { PopoverRootProps } from "./popover.types";

export function PopoverRoot({
  open,
  onOpenChange,
  children,
}: PopoverRootProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Popover.Root>
  );
}
