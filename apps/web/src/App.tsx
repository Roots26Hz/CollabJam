import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from "react";
import { Link, Route, Routes } from "react-router-dom";
import type {
  AgentRole,
  CreateSong,
  Session,
  Song,
  SongHistory,
  SongProduction
} from "@collabjam/shared";
import { playProduction } from "./player";

const roleMeta = {
  rhythm: {
    label: "Rhythm",
    color: "var(--coral)",
    bars: [72, 54, 82, 64, 88, 44]
  },
  harmony: {
    label: "Harmony",
    color: "var(--violet)",
    bars: [40, 76, 58, 90, 68, 52]
  },
  bass: { label: "Bass", color: "var(--mint)", bars: [84, 48, 70, 56, 92, 62] }
} satisfies Record<AgentRole, { label: string; color: string; bars: number[] }>;

function Studio() {
  const [session, setSession] = useState<Session>({ authenticated: false });
  const [songs, setSongs] = useState<Song[]>([]);
  const [production, setProduction] = useState<SongProduction | null>(null);
  const [history, setHistory] = useState<SongHistory | null>(null);
  const [modal, setModal] = useState<"login" | "song" | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState<Set<AgentRole>>(new Set());
  const player = useRef<Awaited<ReturnType<typeof playProduction>> | null>(
    null
  );

  async function loadSongs() {
    const response = await fetch("/api/songs");
    const data = (await response.json()) as { songs: Song[] };
    setSongs(data.songs);
    if (data.songs[0]) {
      const detail = await fetch(`/api/songs/${data.songs[0].slug}`);
      setProduction((await detail.json()) as SongProduction);
      const historyResponse = await fetch(
        `/api/songs/${data.songs[0].slug}/history`
      );
      setHistory((await historyResponse.json()) as SongHistory);
    }
  }

  async function loadSong(slug: string) {
    const response = await fetch(`/api/songs/${slug}`);
    setProduction((await response.json()) as SongProduction);
    const historyResponse = await fetch(`/api/songs/${slug}/history`);
    setHistory((await historyResponse.json()) as SongHistory);
  }

  useEffect(() => {
    void Promise.all([
      fetch("/api/session", { credentials: "include" })
        .then((response) => response.json())
        .then(setSession),
      loadSongs()
    ]).catch(() => setError("The studio API is unavailable."));
    return () => player.current?.stop();
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/session/login", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: form.get("password") })
    });
    if (!response.ok)
      return setError("That password did not unlock the studio.");
    setSession({ authenticated: true });
    setModal(null);
  }

  async function createSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const input: CreateSong = {
      title: String(form.get("title")),
      stylePrompt: String(form.get("stylePrompt")),
      bpm: Number(form.get("bpm")),
      key: String(form.get("key")),
      timeSignature: "4/4"
    };
    const response = await fetch("/api/songs", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) return setError("Could not create that song.");
    const created = (await response.json()) as SongProduction & {
      history: SongHistory;
    };
    setProduction(created);
    setHistory(created.history);
    setSongs((current) => [created.song, ...current]);
    setModal(null);
  }

  async function togglePlayback() {
    if (playing) {
      player.current?.stop();
      player.current = null;
      setPlaying(false);
      return;
    }
    if (!production) return;
    setPlaying(true);
    try {
      player.current = await playProduction(
        production.song,
        production.parts,
        muted,
        () => setPlaying(false)
      );
    } catch {
      setPlaying(false);
      setError("Playback could not start in this browser.");
    }
  }

  function toggleMute(role: AgentRole) {
    setMuted((current) => {
      const next = new Set(current);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      player.current?.setMuted(role, next.has(role));
      return next;
    });
  }

  const song = production?.song;
  return (
    <div className="app-shell">
      <header>
        <Link className="brand" to="/">
          <span className="brand-mark">CJ</span>
          <span>
            CollabJam <b>Studio</b>
          </span>
        </Link>
        <nav>
          <a href="#agents">Parts</a>
          <a href="#history">Workflow</a>
          <a href="#mix">Player</a>
        </nav>
        <button className="auth-button" onClick={() => setModal("login")}>
          <span
            className={
              session.authenticated ? "status-dot online" : "status-dot"
            }
          />
          {session.authenticated ? "Admin online" : "Admin login"}
        </button>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Git-native music production</p>
            <h1>
              Every part gets its own <em>branch.</em>
            </h1>
            <p className="hero-copy">
              Structured rhythm, harmony, and bass parts are ready for isolated
              Codex worktrees. Compose the seed production now and hear the JSON
              come alive.
            </p>
            <div className="hero-actions">
              <button
                className="primary"
                onClick={() =>
                  session.authenticated ? setModal("song") : setModal("login")
                }
              >
                + Create a song
              </button>
              {songs.length > 1 && (
                <select
                  value={song?.slug}
                  onChange={async (event) => {
                    await loadSong(event.target.value);
                  }}
                >
                  {songs.map((item) => (
                    <option value={item.slug} key={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="record-card">
            <div className={`record ${playing ? "spinning" : ""}`}>
              <div className="label">
                <span>COLLAB</span>
                <strong>JAM</strong>
                <small>STEREO / 33 RPM</small>
              </div>
            </div>
            <div className="now-playing">
              <span>{song ? "Current session" : "No session yet"}</span>
              <strong>{song?.title ?? "Create your first song"}</strong>
              <small>
                {song
                  ? `${song.bpm} BPM · ${song.key} · ${song.timeSignature}`
                  : "JSON + Tone.js"}
              </small>
            </div>
          </div>
        </section>

        <section id="agents" className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Structured parts</p>
              <h2>Three voices. One schema.</h2>
            </div>
            <span className="phase-pill">Tone.js ready</span>
          </div>
          <div className="agent-grid">
            {(Object.keys(roleMeta) as AgentRole[]).map((role, index) => {
              const meta = roleMeta[role];
              const part = production?.parts.find((item) => item.role === role);
              return (
                <article
                  className={`agent-card ${muted.has(role) ? "muted" : ""}`}
                  key={role}
                  style={{ "--track-color": meta.color } as CSSProperties}
                >
                  <div className="agent-top">
                    <span className="track-number">0{index + 1}</span>
                    <span className="worktree">
                      {part?.instrument ?? "awaiting song"}
                    </span>
                  </div>
                  <h3>{meta.label}</h3>
                  <code>
                    {song
                      ? `songs/${song.slug}/parts/${role}.json`
                      : `${role}.json`}
                  </code>
                  <div className="waveform">
                    {meta.bars.map((height, bar) => (
                      <i key={bar} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="agent-footer">
                    <span>
                      <b>
                        {part ? `${part.events.length} events` : "Not created"}
                      </b>
                      <small>
                        {history?.branches.find(
                          (branch) => branch.role === role
                        )?.branch ??
                          (part
                            ? `${part.bars} bars · schema v${part.version}`
                            : "Create a song to seed parts")}
                      </small>
                    </span>
                    <button
                      onClick={() => toggleMute(role)}
                      disabled={!part}
                      aria-label={`${muted.has(role) ? "Unmute" : "Mute"} ${meta.label}`}
                    >
                      {muted.has(role) ? "M" : "♪"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="history" className="workflow">
          <p className="eyebrow">Git history</p>
          <h2>Worktrees are ready for agents.</h2>
          <div className="steps">
            <div>
              <b>01</b>
              <h3>Main commit</h3>
              <p>
                {history?.commits[0]?.message ??
                  "Create a song to commit its seed files."}
              </p>
            </div>
            <div>
              <b>02</b>
              <h3>Rhythm</h3>
              <p>
                {history?.branches.find((branch) => branch.role === "rhythm")
                  ?.status ?? "pending"}
              </p>
            </div>
            <div>
              <b>03</b>
              <h3>Harmony</h3>
              <p>
                {history?.branches.find((branch) => branch.role === "harmony")
                  ?.status ?? "pending"}
              </p>
            </div>
            <div>
              <b>04</b>
              <h3>Bass</h3>
              <p>
                {history?.branches.find((branch) => branch.role === "bass")
                  ?.status ?? "pending"}
              </p>
            </div>
          </div>
        </section>

        <section id="mix" className="mix-banner">
          <div>
            <p className="eyebrow">Production player</p>
            <h2>{song?.title ?? "Your final mix starts here."}</h2>
            <p>
              {song?.stylePrompt ??
                "Create a song to generate a deterministic seed arrangement."}
            </p>
          </div>
          <button
            className="play-button"
            disabled={!production}
            onClick={() => void togglePlayback()}
          >
            <span>{playing ? "■" : "▶"}</span>
            {playing ? "Stop production" : "Play production"}
          </button>
        </section>
      </main>
      <footer>
        <span>CollabJam Studio · Pune 2026</span>
        <span>React + Tone.js + Git + Codex</span>
      </footer>

      {modal && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          {modal === "login" ? (
            <form
              className="login-card"
              onSubmit={login}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="close"
                onClick={() => setModal(null)}
              >
                ×
              </button>
              <p className="eyebrow">Studio access</p>
              <h2>Admin login</h2>
              <p>Unlock song creation and future merge controls.</p>
              <label>
                Password
                <input name="password" type="password" autoFocus required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" type="submit">
                Enter studio
              </button>
            </form>
          ) : (
            <form
              className="login-card song-form"
              onSubmit={createSong}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="close"
                onClick={() => setModal(null)}
              >
                ×
              </button>
              <p className="eyebrow">New production</p>
              <h2>Create a song</h2>
              <label>
                Title
                <input
                  name="title"
                  defaultValue="Funk 80s Track"
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Style prompt
                <textarea
                  name="stylePrompt"
                  defaultValue="Punchy neon funk with crisp drums and a warm analog bassline"
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  BPM
                  <input
                    name="bpm"
                    type="number"
                    defaultValue={112}
                    min={40}
                    max={240}
                    required
                  />
                </label>
                <label>
                  Key
                  <input
                    name="key"
                    defaultValue="A minor"
                    required
                    maxLength={12}
                  />
                </label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" type="submit">
                Create production
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="*" element={<Studio />} />
    </Routes>
  );
}
