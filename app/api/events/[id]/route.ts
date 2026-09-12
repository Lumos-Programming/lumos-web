import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin-api-auth";
import { deleteEvent, parseEventInput, updateEvent } from "@/lib/events";
import { toEventErrorResponse } from "@/lib/events-response";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const authorized = await authorizeAdminApi();
  if ("response" in authorized) return authorized.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    await updateEvent(id, parseEventInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to update event");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authorized = await authorizeAdminApi();
  if ("response" in authorized) return authorized.response;

  try {
    const { id } = await params;
    await deleteEvent(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to delete event");
  }
}
