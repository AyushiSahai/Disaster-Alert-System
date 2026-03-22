import express from "express";
import { ddb, UpdateCommand } from "../aws.js";

const router = express.Router();
const DDB_TABLE = process.env.DDB_TABLE;

// NOTE: Protect this route in production. Here it's open for demo purposes.
router.post("/approve", async (req, res) => {
  try {
    const { email, approve } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });
    const status = approve === false ? "REJECTED" : "APPROVED";

    await ddb.send(new UpdateCommand({
      TableName: DDB_TABLE,
      Key: { email },
      UpdateExpression: "SET #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": status }
    }));

    res.json({ ok: true, message: `User ${email} set to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Approval failed", details: err.message });
  }
});

export default router;
