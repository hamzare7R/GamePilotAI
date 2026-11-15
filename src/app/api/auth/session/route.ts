import { getSessionUser } from "@/server/auth/user";
import { jsonOk } from "@/server/http";

export async function GET() {
  const user = await getSessionUser();
  return jsonOk({ user });
}
