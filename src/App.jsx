import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";

export const SERVER = "http://localhost:8080";
const WS_URL = "ws://localhost:8080/ws";

export default function App() {
  const [usuario, setUsuario] = useState("");
  const [conectado, setConectado] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const clientRef = useRef(null);
  const finRef = useRef(null);

  function conectar(e) {
    e.preventDefault();
    if (!usuario.trim()) return;
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      onConnect: () => {
        setConectado(true);
        client.subscribe("/topic/sala", (frame) => {
          try {
            const data = JSON.parse(frame.body);
            setMensajes((prev) => [...prev, data]);
          } catch (err) {
            console.error("Error al procesar mensaje recibido:", err);
          }
        });
        client.publish({
          destination: "/app/chat.unirse",
          body: JSON.stringify({ tipo: "UNION", autor: usuario.trim() }),
        });
      },
      onWebSocketClose: () => setConectado(false),
    });
    client.activate();
    clientRef.current = client;
  }

  function enviar(tipo, contenido) {
    clientRef.current?.publish({
      destination: "/app/chat.enviar",
      body: JSON.stringify({ tipo, autor: usuario.trim(), contenido }),
    });
  }

  function enviarTexto(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    enviar("TEXTO", texto.trim());
    setTexto("");
  }

  useEffect(() => {
    return () => {
      clientRef.current?.deactivate();
    };
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  if (!conectado) {
    return (
      <div className="login-wrapper">
        <form onSubmit={conectar} className="login">
          <h1>Chat en vivo</h1>
          <p>Ingresa tu nombre para conectarte a la sala</p>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Tu nombre"
            autoFocus
          />
          <button type="submit">Entrar al chat</button>
        </form>
      </div>
    );
  }

  return (
    <main className="chat">
      <header className="chat-header">
        <h2>Chat en vivo</h2>
        <span className="estado-badge">Conectado como <strong>{usuario}</strong></span>
      </header>

      <ul className="mensajes">
        {mensajes.map((m, i) => (
          <li
            key={i}
            className={`mensaje-item ${
              m.tipo === "UNION" || m.tipo === "SALIDA"
                ? "sistema"
                : m.autor === usuario
                ? "mio"
                : "otro"
            }`}
          >
            {m.tipo === "TEXTO" && (
              <>
                <b className="autor">{m.autor}</b>
                <span className="contenido">{m.contenido}</span>
              </>
            )}
            {m.tipo === "IMAGEN" && (
              <>
                <b className="autor">{m.autor}</b>
                <img src={SERVER + m.contenido} alt="Imagen enviada" />
              </>
            )}
            {m.tipo === "AUDIO" && (
              <>
                <b className="autor">{m.autor}</b>
                <audio controls src={SERVER + m.contenido} />
              </>
            )}
            {(m.tipo === "UNION" || m.tipo === "SALIDA") && (
              <span className="contenido-sistema">{m.contenido}</span>
            )}
            {m.fecha && <small className="fecha">{m.fecha}</small>}
          </li>
        ))}
        <li ref={finRef} style={{ listStyle: "none" }} />
      </ul>

      <form onSubmit={enviarTexto} className="barra">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit">Enviar</button>
      </form>
    </main>
  );
}
