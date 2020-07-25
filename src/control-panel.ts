import http from "http";

export const controlPanel = (onToggleLazy: (value: boolean) => void, port = 9000) => {
  let lazy = false;
  let retries = 0;

  const requestListener: http.RequestListener = (req, res) => {
    let body = "";

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
    }

    if (req.url !== "/lazy") {
      res.statusCode = 404;
      res.end();
    }

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      if (body === "0" || body === "1") {
        lazy = body === "1";
        onToggleLazy(lazy);
      } else {
        res.statusCode = 400;
      }

      res.end();
    });
  };

  const server = http.createServer(requestListener);

  server.on("error", (e: any) => {
    if (e.code === "EADDRINUSE") {
      console.error(e.message);
      retries += 1;
      const nextPort = retries + port;
      server.close();
      console.log(`retry on port ${nextPort}`);
      server.listen(nextPort, () => {
        console.log(`listening on port ${nextPort}`);
      });
    }
  });

  server.listen(port, () => {
    console.log(`listening on port ${port}`);
  });
};
