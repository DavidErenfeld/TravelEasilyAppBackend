import InitApp from "./app";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import http from "http";

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

  // אם זו סביבת ייצור, שנה את השרת ל-Heroku
  if (process.env.NODE_ENV === "production") {
    options.definition.servers = [
      { url: `https://${process.env.HEROKU_APP_NAME}.herokuapp.com` },
    ];
  }

  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

  const port = process.env.PORT || 3000;

  http.createServer(app).listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
