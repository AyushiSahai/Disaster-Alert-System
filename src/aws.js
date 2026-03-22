import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.AWS_REGION || "ap-south-1";

export const s3 = new S3Client({ region: REGION });
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
export const sns = new SNSClient({ region: REGION });

export { PutObjectCommand, GetCommand, PutCommand, UpdateCommand, PublishCommand };
