import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "./src/lib/db";
import { WebSocketMessage } from "./src/types/hospital";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      const { pathname } = parsedUrl;

      // Endpoint de API para expurgo manual ou status
      if (pathname === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", timestamp: Date.now() }));
        return;
      }

      if (pathname === "/api/expurgo-lgpd" && req.method === "POST") {
        const resultado = db.executarExpurgoLGPD();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, resultado }));
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Erro na requisição HTTP:", err);
      res.statusCode = 500;
      res.end("Erro interno do servidor");
    }
  });

  // Servidor WebSocket integrado de ultrabaixa latência
  const wss = new WebSocketServer({ noServer: true });

  // Broadcast para todos os clientes conectados
  function broadcast(mensagem: WebSocketMessage, remetente?: WebSocket) {
    const raw = JSON.stringify(mensagem);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  }

  wss.on("connection", (ws: WebSocket) => {
    // 1. Enviar estado inicial imediatamente para o novo cliente conectado
    const msgInit: WebSocketMessage = {
      type: "INIT",
      payload: db.getState(),
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(msgInit));

    // 2. Escutar mensagens de mutações em tempo real
    ws.on("message", (data: string) => {
      try {
        const msg: WebSocketMessage = JSON.parse(data.toString());

        if (msg.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now(), clientSent: msg.timestamp }));
          return;
        }

        if (msg.type === "UPDATE_ADMISSOES") {
          db.updateState((prev) => ({
            ...prev,
            admissoes: msg.payload,
          }));
          broadcast(msg, ws);
        } else if (msg.type === "UPDATE_ALTAS") {
          db.updateState((prev) => ({
            ...prev,
            altas: msg.payload,
          }));
          broadcast(msg, ws);
        } else if (msg.type === "UPDATE_PERMANENCIA") {
          db.updateState((prev) => ({
            ...prev,
            permanencia: msg.payload,
          }));
          broadcast(msg, ws);
        } else if (msg.type === "UPDATE_PASSAGEM") {
          db.updateState((prev) => ({
            ...prev,
            passagem: msg.payload,
          }));
          broadcast(msg, ws);
        } else if (msg.type === "UPDATE_AMBULATORIO") {
          db.updateState((prev) => ({
            ...prev,
            ambulantes: msg.payload,
          }));
          broadcast(msg, ws);
        } else if (msg.type === "UPDATE_MODELOS") {
          db.updateState((prev) => ({
            ...prev,
            modelos: msg.payload,
          }));
          broadcast(msg, ws);
        }
      } catch (err) {
        console.error("[WebSocket] Erro ao processar mensagem recebida:", err);
      }
    });

    ws.on("error", (err) => {
      console.error("[WebSocket] Erro na conexão cliente:", err);
    });
  });

  // Gerenciar Upgrade HTTP -> WebSocket
  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url || "");
    if (pathname === "/ws" || pathname === "/_next/webpack-hmr") {
      if (pathname === "/ws") {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      }
    }
  });

  // Agendador de Expurgo LGPD periódico em segundo plano (a cada 30 minutos)
  setInterval(() => {
    const res = db.executarExpurgoLGPD();
    if (res.expurgadasAdmissoes > 0 || res.expurgadasPermanencia) {
      broadcast({
        type: "SYNC_STATE",
        payload: db.getState(),
        timestamp: Date.now(),
      });
    }
  }, 30 * 60 * 1000);

  server.listen(port, () => {
    console.log(`> Servidor CheckList Hospitalar pronto em http://${hostname}:${port}`);
    console.log(`> Canal WebSocket em ws://${hostname}:${port}/ws`);
  });
});
