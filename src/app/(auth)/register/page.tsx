import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/server/auth/user";

export const metadata = { title: "Create account" };

function safeNext(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  if (await getSessionUser()) redirect("/dashboard");
  const params = await searchParams;

  return <AuthForm mode="register" next={safeNext(params.next)} />;
}
