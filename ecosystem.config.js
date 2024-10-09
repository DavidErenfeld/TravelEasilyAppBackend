module.exports = {
  apps : [{
    name   : "backend",
    script : "./dist/src/server.js",
    env_production : {
        NODE_ENV: "production"
    }
  }]
}
