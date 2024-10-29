import { Server as SocketIOServer } from "socket.io";
import http from "http";

export default function initializeSocket(server: http.Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*", // עדיף להגדיר origin מדויק לפרודקשן
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // אירועים עבור עדכון טיול
    socket.on("updateTrip", (tripData) => {
      try {
        io.emit("tripUpdated", tripData);
      } catch (error) {
        console.error("Error updating trip:", error);
      }
    });

    // אירועים עבור הוספת תמונה
    socket.on("addImage", (imageData) => {
      try {
        io.emit("imageAdded", imageData);
      } catch (error) {
        console.error("Error adding image:", error);
      }
    });

    // אירועים עבור הוספת לייק
    socket.on("addLike", (likeData) => {
      try {
        io.emit("likeAdded", likeData);
      } catch (error) {
        console.error("Error adding like:", error);
      }
    });

    // אירועים עבור הוספת תגובה
    socket.on("addComment", (commentData) => {
      try {
        io.emit("commentAdded", commentData);
      } catch (error) {
        console.error("Error adding comment:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}
