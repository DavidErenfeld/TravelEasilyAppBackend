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
        description: "REST server including authontication using JWT",
      },
      servers: [{ url: "http//localhost:3000" }],
    },
    apis: ["./src/routes/*.ts"],
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  };
  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

  if (process.env.NODE_ENV != "production") {
    console.log("devlopment");
    http.createServer(app).listen(process.env.port);
  } else {
    console.log("production");
    const port = process.env.HTTPS_PORT;

    https.createServer(options, app).listen(port, () => {
      console.log("Example app listening at https://localhost:${port}");
    });
  }
});
