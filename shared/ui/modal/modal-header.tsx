import * as Dialog from "@radix-ui/react-dialog"

interface ModalHeaderProps {
  title: string
  subtitle?: string
  onClose?: () => void
}

export function ModalHeader({ title, subtitle }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-100">
      <div className="flex flex-col gap-0.5">
        <Dialog.Title className="text-base font-bold text-neutral-900">
          {title}
        </Dialog.Title>
        {subtitle && (
          <Dialog.Description className="text-xs text-neutral-500">
            {subtitle}
          </Dialog.Description>
        )}
      </div>
      {/* Optional: Add X button here if we pass onClose */}
    </div>
  )
}
