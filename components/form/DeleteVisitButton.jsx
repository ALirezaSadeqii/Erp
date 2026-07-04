"use client";

import { useTransition } from "react";
import { deleteVisit } from "@/lib/actions";
import { Button } from "@/components/ui/Button";

export function DeleteVisitButton({ visitId }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm("Bu ziyareti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      startTransition(async () => {
        const result = await deleteVisit(visitId);
        if (result?.error) {
          alert(result.error);
        }
      });
    }
  };

  return (
    <Button
      type="button"
      variant="danger"
      disabled={isPending}
      onClick={handleDelete}
    >
      {isPending ? "Siliniyor..." : "Ziyareti Sil"}
    </Button>
  );
}
