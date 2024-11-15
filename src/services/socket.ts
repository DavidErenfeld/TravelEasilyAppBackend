import { Server as SocketIOServer, Socket } from "socket.io";
import http from "http";

export let io: SocketIOServer;

export default function initializeSocket(server: http.Server) {
  console.log("Initializing Socket.io server...");

  const allowedOrigins = [
    "https://travel-easily-app.netlify.app", // prodaction
    "http://localhost:5173", // dev
  ];

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true); // מאפשר חיבור אם ה-origin ברשימה
        } else {
          callback(new Error("Not allowed by CORS")); // שגיאה אם ה-origin לא ברשימה
        }
      },
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
  });

  io.use((socket, next) => {
    console.log("Running middleware authentication check...");
    if (socket.handshake.auth.token) {
      console.log("Authentication successful for socket:", socket.id);
      next();
    } else {
      console.error("Authentication error - no token provided");
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // טיפול באירוע של הוספת טיול חדש
    socket.on("newTrip", (newTripData) => {
      console.log("Received newTrip event:", newTripData); // לוג בעת קבלת אירוע newTrip
      handleEventWithErrorLogging(() => {
        io.emit("tripPosted", newTripData); // שולח לכל המשתמשים
      }, "Error posting new trip");
    });

    // טיפול באירוע של עדכון טיול
    socket.on("updateTrip", (tripData) => {
      console.log("Received updateTrip event:", tripData); // לוג בעת קבלת אירוע updateTrip
      handleEventWithErrorLogging(() => {
        io.emit("tripUpdated", tripData);
      }, "Error updating trip");
    });

    socket.on("addLike", (likeData) => {
      console.log("Received addLike event:", likeData);
      handleEventWithErrorLogging(() => {
        io.emit("likeAdded", likeData);
      }, "Error adding like");
    });

    socket.on("addFavorite", ({ userId, tripId }) => {
      console.log(`User ${userId} added trip ${tripId} to favorites.`);
      handleEventWithErrorLogging(() => {
        io.to(userId).emit("favoriteUpdated", { tripId, isFavorite: true });
        console.log(`Event emitted: favoriteTripAdded to userId: ${userId}`);
      }, "Error adding favorite");
    });

    socket.on("removeFavorite", ({ userId, tripId }) => {
      console.log(`User ${userId} removed trip ${tripId} from favorites.`);
      handleEventWithErrorLogging(() => {
        io.to(userId).emit("favoriteUpdated", { tripId, isFavorite: false });
        console.log(`Event emitted: favoriteTripRemoved to userId: ${userId}`);
      }, "Error removing favorite");
    });

    socket.on("addComment", (commentData) => {
      console.log("Received addComment event:", commentData);
      handleEventWithErrorLogging(() => {
        io.emit("commentAdded", commentData);
      }, "Error adding comment");
    });

    socket.on("join", ({ userId }) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    // טיפול באירוע של מחיקת משתמש
    socket.on("deleteUser", ({ userId }) => {
      console.log(`User ${userId} requested account deletion.`);
      io.to(userId).emit("disconnectUser");
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

// פונקציה כללית לניהול אירועים עם טיפול בשגיאות
function handleEventWithErrorLogging(eventFn: Function, errorMsg: string) {
  console.log("Handling event with error logging..."); // לוג לפני הפעלת הפונקציה
  try {
    eventFn();
    console.log("Event handled successfully"); // לוג הצלחה
  } catch (error) {
    console.error(errorMsg, error); // לוג שגיאה
  }
}
