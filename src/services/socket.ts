import { Server as SocketIOServer, Socket } from "socket.io";
import http from "http";

export let io: SocketIOServer;

export default function initializeSocket(server: http.Server) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // יש להגדיר origin מתאים לפרודקשן
      methods: ["GET", "POST"],
    },
    transports: ["websocket"], // שימוש רק ב-WebSocket
  });

  // Middleware לבדיקות טרם חיבור
  io.use((socket, next) => {
    // ניתן להוסיף כאן בדיקות אימות או הרשאות, לדוגמה:
    if (socket.handshake.auth.token) {
      next(); // במידה והבדיקות עוברות, המשך לחיבור
    } else {
      next(new Error("Authentication error")); // חסום חיבור ללא אימות
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // טיפול באירוע של הוספת טיול חדש
    socket.on("newTrip", (newTripData) => {
      handleEventWithErrorLogging(() => {
        io.emit("tripPosted", newTripData); // שולח לכל המשתמשים
      }, "Error posting new trip");
    });

    // טיפול באירוע של עדכון טיול
    socket.on("updateTrip", (tripData) => {
      handleEventWithErrorLogging(() => {
        io.emit("tripUpdated", tripData);
      }, "Error updating trip");
    });

    // טיפול באירוע של הוספת תמונה
    socket.on("addImage", (imageData) => {
      handleEventWithErrorLogging(() => {
        io.emit("imageAdded", imageData);
      }, "Error adding image");
    });

    // טיפול באירוע של הוספת לייק
    socket.on("addLike", (likeData) => {
      handleEventWithErrorLogging(() => {
        io.emit("likeAdded", likeData);
      }, "Error adding like");
    });

    // טיפול באירוע של הוספת תגובה
    socket.on("addComment", (commentData) => {
      handleEventWithErrorLogging(() => {
        io.emit("commentAdded", commentData);
      }, "Error adding comment");
    });

    // טיפול בניתוק חיבור
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

// פונקציה כללית לניהול אירועים עם טיפול בשגיאות
function handleEventWithErrorLogging(eventFn: Function, errorMsg: string) {
  try {
    eventFn();
  } catch (error) {
    console.error(errorMsg, error);
  }
}
