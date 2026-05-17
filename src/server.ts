import { createServer } from "http";
import next from "next";
import { initializeSocket } from "./sockets/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize Socket.IO
  initializeSocket(httpServer);

  httpServer.listen(port, hostname, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO ready on same port`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
  });
});
