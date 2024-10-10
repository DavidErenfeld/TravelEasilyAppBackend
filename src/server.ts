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

  let sslOptions = {};

  if (process.env.NODE_ENV === "production") {
    options.definition.servers = [{ url: `https://your-production-url.com` }];

    if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
      sslOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
      };
    }
  }

  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode");
    http.createServer(app).listen(process.env.PORT || 3000, () => {
      console.log(
        `Server listening on http://localhost:${process.env.PORT || 3000}`
      );
    });
  } else {
    console.log("Running in production mode");
    https.createServer(sslOptions, app).listen(process.env.HTTPS_PORT, () => {
      console.log(
        `Server listening on https://localhost:${process.env.HTTPS_PORT}`
      );
    });
  }
});
