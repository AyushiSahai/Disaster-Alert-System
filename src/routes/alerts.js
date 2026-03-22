import express from "express";
import axios from "axios";
import { ddb, GetCommand, sns, PublishCommand } from "../aws.js";

const router = express.Router();
const DDB_TABLE = process.env.DDB_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

// Thresholds from the spec
const RAIN_MM_THRESHOLD = 10;
const WIND_KMH_THRESHOLD = 20;

router.post("/weather-alert", async (req, res) => {
  try {
    const { email, city } = req.body;
    if (!email || !city) return res.status(400).json({ error: "email and city are required" });

    // Check user and approval status
    const resp = await ddb.send(new GetCommand({ TableName: DDB_TABLE, Key: { email } }));
    const user = resp.Item;
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "APPROVED") return res.status(403).json({ error: "Not approved yet" });

    // Fetch weather
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`;
    const { data } = await axios.get(url);

    // Extract rainfall (mm) and wind (km/h)
    const rain1h = data?.rain?.["1h"] ?? 0;
    const rain3h = data?.rain?.["3h"] ?? 0;
    const rain = Math.max(rain1h, rain3h);
    const windMs = data?.wind?.speed ?? 0; // m/s
    const windKmh = windMs * 3.6;

    const shouldAlert = (rain >= RAIN_MM_THRESHOLD) || (windKmh > WIND_KMH_THRESHOLD);

    if (shouldAlert) {
      const msg = `Potential severe weather in ${city}. Rain: ${rain} mm, Wind: ${windKmh.toFixed(1)} km/h.`;
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: `Disaster Alert: ${city}`,
        Message: msg
      }));
      return res.json({ ok: true, alerted: true, message: "Alert sent via SNS", details: { rain, windKmh } });
    } else {
      return res.json({ ok: true, alerted: false, message: "Conditions normal", details: { rain, windKmh } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Weather check failed", details: err.message });
  }
});

export default router;
