const fs = require("fs");
const S3rver = require("s3rver");

console.log("Starting S3 server...");

new S3rver({
  port: 9000,
  address: "0.0.0.0",
  directory: "./public",
  configureBuckets: [
    {
      name: "peer-prep",
      configs: [fs.readFileSync("./cors.xml")],
    },
  ],
}).run();
