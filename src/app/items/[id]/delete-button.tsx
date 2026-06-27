"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteButton({ deleteAction }: { deleteAction: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
          />
        }
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this item? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={deleteAction}>
            <Button type="submit" variant="destructive">
              Delete permanently
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
