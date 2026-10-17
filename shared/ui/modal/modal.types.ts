export type ModalStatus =
  | "neutral"
  | "success"
  | "warning"
  | "danger"

export interface ModalBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface ModalConfirmProps extends ModalBaseProps {
  title: string
  description?: string
  status?: ModalStatus
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
}

export interface ModalDetailProps extends ModalBaseProps {
  title: string
  subtitle?: string
  footer?: React.ReactNode
  children: React.ReactNode
}
