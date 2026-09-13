import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin-api-auth";
import { deleteEvent, parseEventInput, updateEvent } from "@/lib/events";
import {
  EVENT_API_RESPONSES,
  toEventErrorResponse,
} from "@/lib/events-response";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isAdminSession(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    await updateEvent(id, parseEventInput(body));
    return EVENT_API_RESPONSES.success();
  } catch (error) {
    return toEventErrorResponse(error, "Failed to update event");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isAdminSession(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    await deleteEvent(id);
    return EVENT_API_RESPONSES.success();
  } catch (error) {
    return toEventErrorResponse(error, "Failed to delete event");
  }
}
