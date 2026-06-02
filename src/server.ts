import { createServer } from "http";
import next from "next";
import connectToDatabase from "./lib/mongoose";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Connect to MongoDB
  await connectToDatabase();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
  });
});
