import InitApp from "./app";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import https from "https";
import http from "http";
import fs from "fs";

InitApp().then((app) => {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Web Dev 2024 REST API",
        version: "1.0.0",
        description: "REST server including authentication using JWT",
      },
      servers: [{ url: "http://localhost:3000" }],
    },
    apis: ["./src/routes/*.ts"],
  };

  // הגדרת sslOptions כעצם ריק עם אפשרות להוסיף key ו-cert
  let sslOptions: { key?: Buffer; cert?: Buffer } = {};

  if (process.env.NODE_ENV === "production") {
    options.definition.servers = [{ url: `https://your-production-url.com` }];
    // בדיקה אם קיימים נתיבים לקבצי SSL
    if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
      try {
        sslOptions = {
          key: fs.readFileSync(process.env.SSL_KEY_PATH),
          cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        };
      } catch (error) {
        console.error("Error loading SSL certificates", error);
      }
    }
  }

  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

  // בדיקת סביבת הפיתוח לעומת ייצור
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode");
    const port = process.env.PORT || 3000;
    http.createServer(app).listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } else {
    console.log("Running in production mode");
    const port = process.env.HTTPS_PORT || process.env.PORT;
    if (sslOptions.key && sslOptions.cert) {
      https.createServer(sslOptions, app).listen(port, () => {
        console.log(`Server listening on https://localhost:${port}`);
      });
    } else {
      // fallback ל-HTTP אם אין SSL
      http.createServer(app).listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
      });
    }
  }
});
