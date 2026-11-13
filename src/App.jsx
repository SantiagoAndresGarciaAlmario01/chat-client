import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";

export const SERVER = "http://localhost:8080";
const WS_URL = "ws://localhost:8080/ws";

const RANKS = ["🎮 PRO", "⚡ MASTER", "👑 DIAMOND", "🔥 RADIANT"];

export default function App() {
  const [usuario, setUsuario] = useState("");
  const [rango, setRango] = useState(RANKS[0]);
  const [conectado, setConectado] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const clientRef = useRef(null);
  const finRef = useRef(null);
  const timerEscribiendoRef = useRef(null);
  const fileInputRef = useRef(null);

  function conectar(e) {
    e.preventDefault();
    const tag = usuario.trim();
    if (!tag) return;

    const playerTag = `${rango} ${tag}`;

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      onConnect: () => {
        setConectado(true);

        // Suscripción al chat general
        client.subscribe("/topic/sala", (frame) => {
          try {
            const data = JSON.parse(frame.body);
            setMensajes((prev) => [...prev, data]);
          } catch (err) {
            console.error("Error parseando mensaje:", err);
          }
        });

        // Suscripción al indicador de 'está escribiendo...'
        client.subscribe("/topic/escribiendo", (frame) => {
          const userTyping = frame.body;
          if (userTyping && userTyping !== playerTag) {
            setEscribiendo(userTyping);
            clearTimeout(timerEscribiendoRef.current);
            timerEscribiendoRef.current = setTimeout(() => {
              setEscribiendo("");
            }, 1800);
          }
        });

        // Notificar entrada a la sala
        client.publish({
          destination: "/app/chat.unirse",
          body: JSON.stringify({ tipo: "UNION", autor: playerTag }),
        });
      },
      onWebSocketClose: () => setConectado(false),
    });

    client.activate();
    clientRef.current = client;
    setUsuario(playerTag);
  }

  function notificarEscribiendo() {
    clientRef.current?.publish({
      destination: "/app/chat.escribiendo",
      body: usuario,
    });
  }

  function enviar(tipo, contenido) {
    clientRef.current?.publish({
      destination: "/app/chat.enviar",
      body: JSON.stringify({ tipo, autor: usuario, contenido }),
    });
  }

  function enviarTexto(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    enviar("TEXTO", texto.trim());
    setTexto("");
  }

  async function subirArchivo(archivo) {
    if (!archivo) return;
    try {
      setSubiendo(true);
      const datos = new FormData();
      datos.append("archivo", archivo);
      const r = await fetch(SERVER + "/api/archivos", {
        method: "POST",
        body: datos,
      });
      if (!r.ok) throw new Error("Error en subida");
      const resp = await r.json();
      enviar("IMAGEN", resp.url);
    } catch (err) {
      alert("No se pudo subir la captura: " + err.message);
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function enviarReaccion(emoji) {
    enviar("TEXTO", emoji);
  }

  useEffect(() => {
    return () => {
      clientRef.current?.deactivate();
      clearTimeout(timerEscribiendoRef.current);
    };
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  if (!conectado) {
    return (
      <div className="gamer-login-container">
        <div className="gamer-card">
          <div className="lobby-badge">● SQUAD LOBBY 2026</div>
          <h1 className="gamer-title">NEXUS COMMS</h1>
          <p className="gamer-subtitle">Canal táctico de voz y chat en tiempo real</p>

          <form onSubmit={conectar} className="gamer-form">
            <div className="form-group">
              <label>SELECCIONA TU RANGO</label>
              <div className="ranks-selector">
                {RANKS.map((r) => (
                  <button
                    type="button"
                    key={r}
                    className={`rank-btn ${rango === r ? "selected" : ""}`}
                    onClick={() => setRango(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>GAMERTAG / APODO</label>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ej. CyberKnight_99"
                maxLength={20}
                required
                autoFocus
              />
            </div>

            <button type="submit" className="deploy-btn">
              ⚡ CONECTAR AL LOBBY
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="gamer-chat">
      <header className="gamer-header">
        <div className="header-left">
          <div className="live-indicator">
            <span className="blink-dot"></span>
            <b>SQUAD MATCH IN PROGRESS</b>
          </div>
          <span className="server-status">SERVER: US-EAST · PING: 15ms · 128 TICKS</span>
        </div>
        <div className="header-right">
          <span className="gamer-tag-badge">{usuario}</span>
        </div>
      </header>

      <ul className="gamer-mensajes">
        {mensajes.map((m, i) => {
          const esSistema = m.tipo === "UNION" || m.tipo === "SALIDA";
          const esMio = m.autor === usuario;

          if (esSistema) {
            return (
              <li key={i} className="mensaje-sistema">
                <span className="sys-icon">⚡</span>
                <span className="sys-text">{m.contenido}</span>
                <span className="sys-time">{m.fecha}</span>
              </li>
            );
          }

          return (
            <li key={i} className={`gamer-bubble ${esMio ? "mio" : "otro"}`}>
              <div className="bubble-header">
                <span className="bubble-autor">{m.autor}</span>
                <span className="bubble-time">{m.fecha}</span>
              </div>

              {m.tipo === "TEXTO" && <div className="bubble-text">{m.contenido}</div>}

              {m.tipo === "IMAGEN" && (
                <div className="bubble-image-wrapper">
                  <span className="img-tag">📸 CAPTURA DE PARTIDA</span>
                  <a href={SERVER + m.contenido} target="_blank" rel="noreferrer">
                    <img src={SERVER + m.contenido} alt="Captura gamer" />
                  </a>
                </div>
              )}

              {m.tipo === "AUDIO" && (
                <div className="bubble-audio">
                  <span className="audio-tag">🎙️ TRANSMISIÓN DE VOZ</span>
                  <audio controls src={SERVER + m.contenido} />
                </div>
              )}
            </li>
          );
        })}
        <li ref={finRef} style={{ listStyle: "none" }} />
      </ul>

      {escribiendo && (
        <div className="typing-indicator">
          <span className="typing-dot"></span>
          <span>
            <strong>{escribiendo}</strong> está tecleando en el canal...
          </span>
        </div>
      )}

      <footer className="gamer-controls">
        <div className="quick-reactions">
          {["🔥", "🏆", "💀", "🎯", "🚀", "⚡"].map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => enviarReaccion(emoji)}
              className="quick-btn"
              title={`Enviar ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={enviarTexto} className="gamer-input-bar">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.[0]) subirArchivo(e.target.files[0]);
            }}
          />

          <button
            type="button"
            className="attach-btn"
            title="Compartir captura de partida"
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendo}
          >
            {subiendo ? "⏳" : "📷"}
          </button>

          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              notificarEscribiendo();
            }}
            placeholder="Enviar mensaje al escuadrón (Enter para enviar)..."
          />

          <button type="submit" className="send-btn">
            DISPARAR ❯
          </button>
        </form>
      </footer>
    </main>
  );
}
