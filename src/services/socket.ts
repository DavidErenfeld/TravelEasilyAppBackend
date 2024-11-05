import { Server as SocketIOServer, Socket } from "socket.io";
import http from "http";

export let io: SocketIOServer;

export default function initializeSocket(server: http.Server) {
  console.log("Initializing Socket.io server..."); // לוג לאתחול השרת

  io = new SocketIOServer(server, {
    cors: {
      origin: "https://travel-easily-app.netlify.app/", // יש להגדיר origin מתאים לפרודקשן
      methods: ["GET", "POST"],
    },
    transports: ["websocket"], // שימוש רק ב-WebSocket
  });

  // Middleware לבדיקות טרם חיבור
  io.use((socket, next) => {
    console.log("Running middleware authentication check..."); // לוג למעבר במידלוור
    if (socket.handshake.auth.token) {
      console.log("Authentication successful for socket:", socket.id); // הצלחת אימות
      next(); // במידה והבדיקות עוברות, המשך לחיבור
    } else {
      console.error("Authentication error - no token provided"); // שגיאת אימות
      next(new Error("Authentication error")); // חסום חיבור ללא אימות
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

    // טיפול באירוע של הוספת תמונה
    socket.on("addImage", (imageData) => {
      console.log("Received addImage event:", imageData); // לוג בעת קבלת אירוע addImage
      handleEventWithErrorLogging(() => {
        io.emit("imageAdded", imageData);
      }, "Error adding image");
    });

    // טיפול באירוע של הוספת לייק
    socket.on("addLike", (likeData) => {
      console.log("Received addLike event:", likeData); // לוג בעת קבלת אירוע addLike
      handleEventWithErrorLogging(() => {
        io.emit("likeAdded", likeData);
      }, "Error adding like");
    });

    // טיפול באירוע של הוספת תגובה
    socket.on("addComment", (commentData) => {
      console.log("Received addComment event:", commentData); // לוג בעת קבלת אירוע addComment
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
  console.log("Handling event with error logging..."); // לוג לפני הפעלת הפונקציה
  try {
    eventFn();
    console.log("Event handled successfully"); // לוג הצלחה
  } catch (error) {
    console.error(errorMsg, error); // לוג שגיאה
  }
}
