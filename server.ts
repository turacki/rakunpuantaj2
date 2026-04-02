import express from "express";
import path from "path";
import { createHmac, timingSafeEqual } from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ADISYO_API_SECRET_KEY = process.env.ADISYO_API_SECRET_KEY || "6d1fc725-5c47-4157-bdec-d8455d10e031";

  // Signature verification function
  function verifySignature(payload: string, signature: string, apiKey: string) {
    try {
      const webhookData = JSON.parse(payload);
      const message = `${webhookData.WebhookEventType}|${webhookData.EventTimeUtc}|${apiKey}`;
      const expectedSignature = createHmac('sha256', apiKey)
        .update(message)
        .digest('base64');
      
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (e) {
      return false;
    }
  }

  // Webhook endpoint
  app.post('/api/webhook/adisyo', (req, res) => {
    try {
      // URL verification - Adisyo sends "adisyo" string
      if (req.body === 'adisyo') {
        console.log('Adisyo webhook URL verified');
        return res.status(200).send('adisyo');
      }
      
      // Signature verification
      const signature = req.headers['x-adisyo-signature'] as string;
      if (signature && !verifySignature(JSON.stringify(req.body), signature, ADISYO_API_SECRET_KEY)) {
        console.warn('Invalid Adisyo signature');
        // return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Process webhook
      console.log('Adisyo Webhook received:', req.body);
      
      // Here we can emit to sockets or update DB
      // For now, just log
      res.status(200).json({ success: true });
      
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
