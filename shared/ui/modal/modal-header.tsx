import * as Dialog from "@radix-ui/react-dialog"

interface ModalHeaderProps {
  title: string
  subtitle?: string
}

export function ModalHeader({ title, subtitle }: ModalHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <Dialog.Title className="text-base font-semibold">
        {title}
      </Dialog.Title>
      {subtitle && (
        <Dialog.Description className="text-sm text-muted-foreground">
          {subtitle}
        </Dialog.Description>
      )}
    </div>
  )
}
