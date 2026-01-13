"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createExpense } from "@/app/flow/finance/actions";
import { ModalRoot, ModalHeader, ModalFooter } from "@/shared/ui/modal";
import { Button, Input } from "@/shared/ui/primitives";
import { Plus } from "lucide-react";
// import toast from "react-hot-toast";

export default function AddExpenseModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await createExpense(null, formData);
            if (result.error) {
                // toast.error(result.error);
                console.error(result.error);
            } else {
                // toast.success("Expense created");
                setIsOpen(false);
            }
        });
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
            </Button>

            <ModalRoot open={isOpen} onOpenChange={setIsOpen}>
                <Dialog.Content className="fixed left-[50%] top-[50%] z-[1001] w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white shadow-lg focus:outline-none">
                    <ModalHeader title="Add New Expense" />
                    <form action={handleSubmit} className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Description</label>
                            <Input name="description" required placeholder="e.g. Flight tickets" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Amount</label>
                            <Input name="amount" type="number" required placeholder="0" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Category</label>
                            <Input name="category" placeholder="Transport, Meals, etc." />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Date</label>
                            <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>

                        <ModalFooter>
                            <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Saving..." : "Create Expense"}
                            </Button>
                        </ModalFooter>
                    </form>
                </Dialog.Content>
            </ModalRoot>
        </>
    );
}
