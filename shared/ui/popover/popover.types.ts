export interface PopoverRootProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export interface PopoverContentProps {
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  offset?: number
  className?: string
  children: React.ReactNode
}
