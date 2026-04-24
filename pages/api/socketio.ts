import type { Server as HTTPServer } from "node:http";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";
import { subscribeRealtimeEvents } from "@/lib/realtime-events";
import { verifyRealtimeSocketToken } from "@/lib/realtime-socket-auth";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse["socket"] & {
    server: HTTPServer & {
      io?: SocketIOServer;
      ioRealtimeUnsubscribe?: () => void;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function socketHandler(_request: NextApiRequest, response: NextApiResponseWithSocket) {
  if (!response.socket.server.io) {
    const io = new SocketIOServer(response.socket.server, {
      path: "/api/socketio",
      cors: {
        origin: true,
        credentials: true,
      },
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string") {
        next(new Error("Unauthorized"));
        return;
      }

      const payload = verifyRealtimeSocketToken(token);
      if (!payload) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.data.identity = {
        userId: payload.userId,
        role: payload.role,
      };

      socket.join(`user:${payload.userId}`);
      next();
    });

    const unsubscribe = subscribeRealtimeEvents((event) => {
      io.to(`user:${event.userId}`).emit(event.type, event.payload);
    });

    io.on("connection", (socket) => {
      socket.emit("connected", {
        ok: true,
        timestamp: new Date().toISOString(),
      });
    });

    response.socket.server.io = io;
    response.socket.server.ioRealtimeUnsubscribe = unsubscribe;
  }

  response.end();
}
