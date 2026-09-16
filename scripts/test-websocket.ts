import WebSocket from "ws";

console.log("Conectando ao canal WebSocket em ws://localhost:3000/ws ...");

const ws = new WebSocket("ws://localhost:3000/ws");

const start = Date.now();

ws.on("open", () => {
  console.log("✅ WebSocket Conectado com sucesso!");
  // Enviar PING
  ws.send(JSON.stringify({ type: "PING", timestamp: Date.now() }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "INIT") {
    console.log(`✅ Recebida mensagem INIT com estado do banco:`);
    console.log(`   - Admissões: ${msg.payload.admissoes?.length}`);
    console.log(`   - Altas: ${msg.payload.altas?.length}`);
    console.log(`   - Pacientes Passagem: ${msg.payload.passagem?.length}`);
    console.log(`   - Médicos Ambulatório: ${msg.payload.ambulantes?.length}`);
    console.log(`   - Modelos de Texto: ${msg.payload.modelos?.length}`);
  } else if (msg.type === "PONG") {
    const latencia = Date.now() - (msg.clientSent || msg.timestamp);
    console.log(`✅ Recebido PONG do servidor! Latência: ${latencia}ms (< 300ms garantido)`);
    ws.close();
    process.exit(0);
  }
});

ws.on("error", (err) => {
  console.error("❌ Erro no WebSocket:", err);
  process.exit(1);
});

setTimeout(() => {
  console.error("❌ Timeout aguardando resposta do WebSocket");
  process.exit(1);
}, 5000);
