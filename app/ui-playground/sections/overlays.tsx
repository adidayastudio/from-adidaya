"use client";

import { useState } from "react";
import { Drawer } from "@/shared/ui/overlays/Drawer";
import { DrawerHeader } from "@/shared/ui/overlays/DrawerHeader";
import { DrawerBody } from "@/shared/ui/overlays/DrawerBody";
import { DrawerFooter } from "@/shared/ui/overlays/DrawerFooter";
import { Button } from "@/shared/ui/primitives/button/button";

export default function OverlayPlayground() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}>
        Open Drawer
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} size="lg">
        <DrawerHeader
          title="Task Detail"
          onClose={() => setOpen(false)}
        />
        <DrawerBody>
          <p className="text-sm">
            Ini nanti isi detail task / project / expense.
          </p>
        </DrawerBody>
        <DrawerFooter>
          <div className="flex justify-end gap-2">
            <Button variant="secondary">Cancel</Button>
            <Button>Save</Button>
          </div>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}
