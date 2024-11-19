# Travel Easily - Share Your Journey

---

## **Purpose of the Application**

Travel Easily is designed to provide a community platform where travelers can share and discover travel itineraries in a simple, intuitive, and ad-free environment. The application allows users to upload detailed routes, share experiences, and help others plan their next trip based on recommendations and ratings.

---

## **About the Project**

Travel Easily is a web-based community travel-sharing application built as a final project during a computer science degree with two teammates:

- The backend was developed by two members of the team (including me).
- The frontend was developed entirely by me.
- The overall management and organization were handled by the third team member.

---

## **Key Features**

### **Users**

- Register and log in using Google OAuth or email and password.
- Upload and update profile pictures.
- Reset passwords via email with a recovery link.
- Delete accounts, including all associated data.

### **Posts**

- Create posts with the ability to upload images.
- Preview images before uploading.
- Edit posts: Add days, upload additional images, or delete existing ones.
- Delete posts easily.

### **Post Interaction**

- Add comments to other users' posts.
- Mark posts as favorites and view a list of favorites.
- Like and unlike posts.

### **Sharing**

- Share posts on social networks and via email (frontend feature only).
- Share location and get attractions nearby using the Google Places API, with Redis used to reduce unnecessary API calls.

### **Smart Filtering**

- Filter posts by:
  - Country name.
  - Traveler type.
  - Trip type.
  - Number of days.

### **Real-Time Updates**

- Actions like likes, comments, or post creation update in real-time using Socket.IO.

---

## **Technologies**

### **Backend**

- **Node.js & Express**: API development.
- **TypeScript**: For type safety and clear code management.
- **Swagger**: For API documentation.
- **Socket.IO**: For real-time communication.
- **JWT**: For user authentication and security.
- **Redis**: For temporary data storage to optimize performance and reduce Google API calls.
- **Cloudinary**: For image storage.
- **PostgreSQL**: Relational database for table synchronization.
- **Heroku**: For server deployment.

### **Frontend**

- **React** with **TypeScript**: Frontend development.
- **Socket.IO**: Real-time updates on the client side.
- **CSS**: Custom styling for the application.
- **Google OAuth**: For user authentication.
- **Netlify**: For application deployment.

---

## **Testing**

- Unit tests were written using **Jest** to ensure stability and maintain code quality on the server side.

---

## **Key Challenges**

1. **Efficient Use of Google Places API**: Careful planning to manage API calls and maintain efficiency with Redis.
2. **Database Selection**: PostgreSQL was chosen to support complex relationships between tables, such as relationships between users, likes, and comments.
3. **Real-Time Updates**: Advanced logic was developed to handle smooth and fast updates using Socket.IO.
4. **User Deletion**:
   - Securely delete all user-related data, including:
     - Likes and comments the user made on other posts.
     - All posts and personal images.
     - Images stored on Cloudinary.

---

## **Feedback and Future Improvements**

- **Initial Feedback**: Users emphasized the importance of a simple interface and real-time updates.
- **Future Development**:
  - Adding an admin panel for managing users and content.
  - Advanced filters for posts (e.g., by rating, country, trip duration).
  - Attraction and trip ratings.
  - Private group sharing for travel details.

---
