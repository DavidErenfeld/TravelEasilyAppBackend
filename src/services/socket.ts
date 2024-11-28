import { Server as SocketIOServer, Socket } from "socket.io";
import http from "http";

export let io: SocketIOServer;

export default function initializeSocket(server: http.Server) {
  console.log("Initializing Socket.io server...");

  const allowedOrigins = [
    "https://travel-easily-app.netlify.app",
    "http://localhost:5173",
  ];

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
  });

  io.use((socket, next) => {
    console.log("Running middleware authentication check...");
    if (socket.handshake.auth.token) {
      next();
    } else {
      console.error("Authentication error - no token provided");
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Timeout mechanism to disconnect inactive sockets
    // מנגנון Timeout לניתוק סוקט שלא פעיל לאורך זמן
    let timeout: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log(`Disconnecting socket: ${socket.id} due to inactivity`);
        socket.disconnect(); // נתק את החיבור אם אין פעילות
      }, 300000); // 5 דקות של חוסר פעילות
    };

    // הפעל את מנגנון ה-Timeout בכל התחברות ובכל פעולה
    resetTimeout();
    socket.onAny(() => resetTimeout()); // איפוס Timeout בכל אירוע

    // Event listeners remain unchanged
    socket.on("newTrip", (newTripData) => {
      handleEventWithErrorLogging(() => {
        io.emit("tripPosted", newTripData);
      }, "Error posting new trip");
    });

    socket.on("deleteTrip", ({ tripId }) => {
      handleEventWithErrorLogging(() => {
        io.emit("tripDeleted", { tripId });
      }, "Error emitting tripDeleted event");
    });

    socket.on("updateTrip", (tripData) => {
      handleEventWithErrorLogging(() => {
        io.emit("tripUpdated", tripData);
      }, "Error updating trip");
    });

    socket.on("addLike", (likeData) => {
      console.log("Received addLike event:");
      handleEventWithErrorLogging(() => {
        io.emit("likeAdded", likeData);
      }, "Error adding like");
    });

    socket.on("addFavorite", ({ userId, tripId }) => {
      handleEventWithErrorLogging(() => {
        io.to(userId).emit("favoriteUpdated", { tripId, isFavorite: true });
      }, "Error adding favorite");
    });

    socket.on("removeFavorite", ({ userId, tripId }) => {
      handleEventWithErrorLogging(() => {
        io.to(userId).emit("favoriteUpdated", { tripId, isFavorite: false });
      }, "Error removing favorite");
    });

    socket.on("addComment", (commentData) => {
      handleEventWithErrorLogging(() => {
        io.emit("commentAdded", commentData);
      }, "Error adding comment");
    });

    socket.on("join", ({ userId }) => {
      socket.join(userId);
    });

    socket.on("deleteUser", async ({ userId }) => {
      try {
        const deletedTripIds = [];
        const deletedCommentIds = [];
        const deletedLikeIds = [];

        io.emit("userDeleted", {
          userId,
          deletedTripIds,
          deletedCommentIds,
          deletedLikeIds,
        });

        io.to(userId).emit("disconnectUser");
      } catch (error) {
        console.error("Error handling deleteUser event:", error);
      }
    });

    // Handle disconnection with cleanup
    // טיפול באירוע disconnect
    socket.on("disconnect", () => {
      clearTimeout(timeout); // נקה את ה-Timeout כדי למנוע זליגת זיכרון
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

// Utility function for error handling in events
function handleEventWithErrorLogging(eventFn: Function, errorMsg: string) {
  try {
    eventFn();
  } catch (error) {
    console.error(errorMsg, error);
  }
}
