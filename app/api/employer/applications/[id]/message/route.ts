import { NextRequest } from "next/server";
import { z } from "zod";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  createApiError,
  ErrorCode,
  errorResponse,
  successResponse,
} from "@/lib/api-errors";
import { employerApplicationMessageSchema } from "@/lib/validation-schemas";
import { supabaseAdmin } from "@/lib/supabase";
import { publishRealtimeEvent } from "@/lib/realtime-events";
import { tryCreateNotification } from "@/lib/notifications";

type EmployerApplicationMessageBody = z.infer<typeof employerApplicationMessageSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createPostHandler<EmployerApplicationMessageBody>(
    async (ctx: ApiHandlerContext, body?: EmployerApplicationMessageBody) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const payload = body;
      if (!payload) {
        return errorResponse(
          createApiError(ErrorCode.BAD_REQUEST, "Invalid request body"),
          ctx.requestId
        );
      }

      const { data: application } = await supabaseAdmin
        .from("applications")
        .select("applicant_id, employer_id")
        .eq("id", id)
        .eq("employer_id", ctx.user.id)
        .single();

      if (!application) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Application not found"),
          ctx.requestId
        );
      }

      const messageText = payload.message.trim();

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("messages")
        .insert({
          sender_id: ctx.user.id,
          recipient_id: application.applicant_id,
          content: messageText,
          read: false,
        })
        .select("id, sender_id, recipient_id, content, created_at")
        .single();

      if (insertError || !inserted) {
        return errorResponse(
          createApiError(
            ErrorCode.DATABASE_ERROR,
            insertError?.message || "Failed to send message"
          ),
          ctx.requestId
        );
      }

      await supabaseAdmin
        .from("applications")
        .update({ feedback: messageText, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("employer_id", ctx.user.id);

      const createdAtIso = new Date(String(inserted.created_at)).toISOString();
      publishRealtimeEvent({
        type: "message:new",
        userId: inserted.recipient_id,
        payload: {
          messageId: inserted.id,
          senderId: inserted.sender_id,
          recipientId: inserted.recipient_id,
          createdAt: createdAtIso,
        },
      });
      publishRealtimeEvent({
        type: "message:new",
        userId: inserted.sender_id,
        payload: {
          messageId: inserted.id,
          senderId: inserted.sender_id,
          recipientId: inserted.recipient_id,
          createdAt: createdAtIso,
        },
      });

      const notificationMessage =
        messageText.length > 240 ? `${messageText.slice(0, 237)}...` : messageText;

      await tryCreateNotification({
        userId: inserted.recipient_id,
        role: "jobseeker",
        type: "message",
        title: "Employer Feedback Received",
        message: notificationMessage,
        relatedId: inserted.id,
        relatedType: "message",
      });

      return successResponse(
        {
          message: "Message sent successfully",
          data: {
            id: inserted.id,
            applicationId: id,
            senderId: inserted.sender_id,
            recipientId: inserted.recipient_id,
            content: inserted.content,
            createdAt: createdAtIso,
          },
        },
        ctx.requestId
      );
    },
    {
      bodySchema: employerApplicationMessageSchema,
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 40,
    }
  );

  return handler(request);
}