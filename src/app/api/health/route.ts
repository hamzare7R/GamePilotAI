import { jsonOk } from "@/server/http";

export async function GET() {
  return jsonOk({
    status: "ok",
    service: "gamepilot-ai",
    timestamp: new Date().toISOString(),
  });
}
