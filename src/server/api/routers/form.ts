import { S3Client } from "@aws-sdk/client-s3";

const UPLOAD_MAX_FILE_SIZE = 400000;

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
  },
});
