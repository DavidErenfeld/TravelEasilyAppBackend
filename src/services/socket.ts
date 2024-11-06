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

    // טיפול באירוע של הוספת לייק
    socket.on("addLike", (likeData) => {
      console.log("Received addLike event:", likeData); // לוג בעת קבלת אירוע addLike
      handleEventWithErrorLogging(() => {
        io.emit("likeAdded", likeData); // שליחה לכל המשתמשים
        io.to(likeData.userId).emit("likeStatusUpdated", {
          // שליחה לחדר של המשתמש
          tripId: likeData.tripId,
          status: likeData.status,
        });
      }, "Error adding like");
    });

    // טיפול באירוע של הוספת תגובה
    socket.on("addComment", (commentData) => {
      console.log("Received addComment event:", commentData); // לוג בעת קבלת אירוע addComment
      handleEventWithErrorLogging(() => {
        io.emit("commentAdded", commentData);
      }, "Error adding comment");
    });

    // הצטרפות לחדר על פי מזהה המשתמש
    socket.on("join", ({ userId }) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} הצטרף לחדר ${userId}`);
    });

    // טיפול באירוע של מחיקת משתמש
    socket.on("deleteUser", ({ userId }) => {
      console.log(`User ${userId} requested account deletion.`);
      // שליחת אירוע לניתוק כל המכשירים של המשתמש
      io.to(userId).emit("disconnectUser");
    });

    // טיפול בניתוק חיבור
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
