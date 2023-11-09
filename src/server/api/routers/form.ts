import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { nanoid } from "nanoid";
import { env } from "~/env.mjs";
import { createTRPCRouter, publicProcedure } from "../trpc";

const UPLOAD_MAX_FILE_SIZE = 400000;

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
  },
});

export const formRouter = createTRPCRouter({
  createPresignedUrl: publicProcedure.query(async () => {
    const imageId = nanoid(8);
    return createPresignedPost(s3Client, {
      Bucket: env.S3_BUCKET_NAME,
      Key: imageId,
      Fields: {
        key: imageId,
      },
      Conditions: [
        ["starts-with", "$Content-Type", "image/"],
        ["content-length-range", 0, UPLOAD_MAX_FILE_SIZE],
      ],
    });
  }),
});
