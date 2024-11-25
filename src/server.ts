import InitApp from "./app";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import http from "http";
import initializeSocket from "./services/socket";

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

  if (process.env.NODE_ENV === "production") {
    options.definition.servers = [
      { url: `https://evening-bayou-77034-176dc93fb1e1.herokuapp.com` },
    ];
  }

  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

  const port = process.env.PORT || 3000;

  const server = http.createServer(app);
  initializeSocket(server);

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
