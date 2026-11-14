"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await apiClient.delete("/admin/login");
        } finally {
          router.replace("/admin/login");
          router.refresh();
        }
      }}
    >
      <LogOut aria-hidden="true" />
      Sign out
    </Button>
  );
}
