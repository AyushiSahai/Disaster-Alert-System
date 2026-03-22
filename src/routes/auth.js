import express from "express";
import bcrypt from "bcrypt";
import { ddb, PutCommand, GetCommand } from "../aws.js";
import { zipJsonToBuffer } from "../util/zip.js";
import { s3, PutObjectCommand } from "../aws.js";

const router = express.Router();

const DDB_TABLE = process.env.DDB_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;

router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, city, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    // Save user to DynamoDB with PENDING status
    const item = { email, name, phone, city, status: "PENDING", passwordHash, createdAt };
    await ddb.send(new PutCommand({ TableName: DDB_TABLE, Item: item }));

    // Create a zipped copy of the signup form and upload to S3
    const zipBuffer = await zipJsonToBuffer("signup.json", item);
    const key = `forms/${email}-${Date.now()}.zip`;
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: zipBuffer,
      ContentType: "application/zip"
    }));

    res.json({ ok: true, message: "Signup received. Await admin approval.", s3Key: key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const resp = await ddb.send(new GetCommand({ TableName: DDB_TABLE, Key: { email } }));
    const user = resp.Item;
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status !== "APPROVED") {
      return res.status(403).json({ error: "Access pending admin approval" });
    }
    // In a real app, issue a JWT; for simplicity return user basics.
    res.json({ ok: true, user: { email: user.email, name: user.name, city: user.city } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

export default router;
