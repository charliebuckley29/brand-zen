import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.SQS_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export const handler = async (event) => {
  console.log("🔔 Lambda invoked with event:", JSON.stringify(event, null, 2));

  try {
    // Log headers for debugging
    const headers = event.headers || {};
    console.log("📨 Incoming headers:", JSON.stringify(headers, null, 2));

    // Validate webhook secret
    if (headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
      console.warn("🚫 Unauthorized webhook call. Provided secret:", headers['x-webhook-secret']);
      return { statusCode: 401, body: "Unauthorized" };
    }
    console.log("✅ Webhook secret validated");

    // Parse body
    const body = JSON.parse(event.body);
    console.log("📦 Incoming body:", JSON.stringify(body, null, 2));

    const mention = body.record;
    console.log("📝 Parsed mention record:", JSON.stringify(mention, null, 2));

    // Send mention to SQS
    await sqs.send(new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(mention),
    }));
    console.log(`📤 Successfully enqueued mention with id=${mention.id} to SQS`);

    return { statusCode: 200, body: "Mention enqueued" };
  } catch (err) {
    console.error("💥 Error enqueuing mention:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
