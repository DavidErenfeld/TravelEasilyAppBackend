# **Travel Easily - Backend**

---

## **Application Purpose**

**Travel Easily** is a community platform for sharing travel itineraries, providing users with an intuitive and ad-free interface where they can share, discover, and recommend travel routes.

---

## **About the Project**

The application was built as a final project during a computer science degree with two teammates:

- The backend was developed by two team members (including me).
- The frontend was entirely developed by me.
- The overall management and organization of the project were handled by the third team member.

---

## **Key Features**

### **Users**

- Register and log in using **Google OAuth** or email and password.
- Upload and update profile pictures.
- Reset passwords via email with a recovery link.
- Delete accounts, including all associated data.

### **Post Management**

- Create posts with image upload support.
- Preview images before uploading.
- Edit posts (add days, upload additional images, or delete existing ones).
- Easily delete posts.

### **Post Interaction**

- Add comments to other users' posts.
- Mark posts as favorites.
- Like and unlike posts.

### **Location Sharing and Attractions**

- Search for nearby attractions using **Google Places API**.
- Utilize **Redis** to minimize API calls and improve performance.

### **Real-Time Updates**

- Actions such as likes, comments, or post creation update in real-time using **Socket.IO**.

### **Post Filtering**

- Filter posts by:
  - Country name.
  - Traveler type.
  - Trip type.
  - Number of days.

---

## **Technologies Used**

- **Node.js & Express** – API development.
- **TypeScript** – For improved code safety and clear management.
- **Swagger** – API documentation.
- **Socket.IO** – Real-time updates.
- **JWT** – User authentication and security.
- **Redis** – Data caching and performance optimization.
- **Cloudinary** – Image storage.
- **PostgreSQL** – Database for managing relationships between entities.
- **Heroku** – Server deployment.
- **Docker** – Containerizing the application.
- **Docker Compose** – Managing a multi-container environment (backend, PostgreSQL, Redis).

---

## **Setup Instructions**

### **Run Locally (Without Docker)**

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file with the required environment variables.

3. Start the server:
   ```sh
   npm run dev
   ```

### **Run with Docker**

1. **Build and start the containers:**

   ```sh
   docker-compose up --build
   ```

2. **Stop the containers:**

   ```sh
   docker-compose down -v
   ```

3. **Rebuild and restart if needed:**
   ```sh
   docker-compose up --force-recreate --build
   ```

---

## **Testing**

- Run unit tests with Jest:

  ```sh
  npm run test
  ```

- Test user authentication:

  ```sh
  npm run testAuth
  ```

- Test trip routes:
  ```sh
  npm run testTrip
  ```

---

## **Key Challenges**

1. **Efficient Google Places API Usage** – Implementing Redis caching to minimize API calls and improve performance.
2. **Real-Time Updates** – Developing advanced logic to handle fast and seamless updates with Socket.IO.
3. **Secure User Deletion** – Ensuring complete removal of user-related data, including likes, comments, posts, and images.
4. **Docker Integration** – Fully containerizing the server, database, and caching system with Docker and Docker Compose.

---

## **Future Development Plans**

- Adding an **Admin Panel** for managing users and content.
- Enhancing logging and monitoring within the Docker environment.
- Expanding Redis functionality for further performance optimizations.

---

🔥 **The project is continuously evolving!**
