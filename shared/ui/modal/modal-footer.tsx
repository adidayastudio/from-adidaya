interface ModalFooterProps {
  children: React.ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="flex justify-end gap-2 border-t px-4 py-3">
      {children}
    </div>
  )
}
