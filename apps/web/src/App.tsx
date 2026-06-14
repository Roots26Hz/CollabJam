import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, Route, Routes } from "react-router-dom";
import type { Session } from "@collabjam/shared";

const tracks = [
  {
    role: "Rhythm",
    branch: "funk-80s-track/rhythm",
    color: "var(--coral)",
    bars: [72, 54, 82, 64, 88, 44]
  },
  {
    role: "Harmony",
    branch: "funk-80s-track/harmony",
    color: "var(--violet)",
    bars: [40, 76, 58, 90, 68, 52]
  },
  {
    role: "Bass",
    branch: "funk-80s-track/bass",
    color: "var(--mint)",
    bars: [84, 48, 70, 56, 92, 62]
  }
];

function Studio() {
  const [session, setSession] = useState<Session>({ authenticated: false });
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/session", { credentials: "include" })
      .then((response) => response.json())
      .then(setSession)
      .catch(() => undefined);
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
    if (!response.ok) {
      setError("That password did not unlock the studio.");
      return;
    }
    setSession({ authenticated: true });
    setShowLogin(false);
  }

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
          <a href="#agents">Agents</a>
          <a href="#history">History</a>
          <a href="#mix">Final mix</a>
        </nav>
        <button className="auth-button" onClick={() => setShowLogin(true)}>
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
              Codex agents compose in parallel worktrees. You review every
              change, merge the best takes, and hear the result come together.
            </p>
            <div className="hero-actions">
              <button className="primary">+ Create a song</button>
              <a href="#agents">Explore the workflow ↓</a>
            </div>
          </div>
          <div className="record-card">
            <div className="record">
              <div className="label">
                <span>COLLAB</span>
                <strong>JAM</strong>
                <small>STEREO / 33 RPM</small>
              </div>
            </div>
            <div className="now-playing">
              <span>Demo session</span>
              <strong>Funk 80s Track</strong>
              <small>112 BPM · A minor · 4/4</small>
            </div>
          </div>
        </section>

        <section id="agents" className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Session workspace</p>
              <h2>Three agents. One production.</h2>
            </div>
            <span className="phase-pill">Foundation preview</span>
          </div>
          <div className="agent-grid">
            {tracks.map((track, index) => (
              <article
                className="agent-card"
                key={track.role}
                style={{ "--track-color": track.color } as CSSProperties}
              >
                <div className="agent-top">
                  <span className="track-number">0{index + 1}</span>
                  <span className="worktree">isolated worktree</span>
                </div>
                <h3>{track.role}</h3>
                <code>{track.branch}</code>
                <div className="waveform">
                  {track.bars.map((height, bar) => (
                    <i key={bar} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="agent-footer">
                  <span>
                    <b>Ready</b>
                    <small>Waiting for Phase 4</small>
                  </span>
                  <button aria-label={`Open ${track.role} agent`}>→</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="history" className="workflow">
          <p className="eyebrow">How it ships</p>
          <h2>Composition with a commit history.</h2>
          <div className="steps">
            <div>
              <b>01</b>
              <h3>Generate</h3>
              <p>Agents write structured music parts in parallel.</p>
            </div>
            <div>
              <b>02</b>
              <h3>Review</h3>
              <p>Inspect commits and real GitHub pull requests.</p>
            </div>
            <div>
              <b>03</b>
              <h3>Merge</h3>
              <p>Approve the parts that belong in the production.</p>
            </div>
            <div>
              <b>04</b>
              <h3>Play</h3>
              <p>Tone.js performs only what reached main.</p>
            </div>
          </div>
        </section>

        <section id="mix" className="mix-banner">
          <div>
            <p className="eyebrow">Main branch</p>
            <h2>The final mix lives here.</h2>
            <p>Nothing plays in production until a human approves it.</p>
          </div>
          <button disabled>
            <span>▶</span> Playback arrives in Phase 2
          </button>
        </section>
      </main>

      <footer>
        <span>CollabJam Studio · Pune 2026</span>
        <span>React + Node.js + Git + Codex</span>
      </footer>

      {showLogin && (
        <div className="modal-backdrop" onMouseDown={() => setShowLogin(false)}>
          <form
            className="login-card"
            onSubmit={login}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setShowLogin(false)}
            >
              ×
            </button>
            <p className="eyebrow">Studio access</p>
            <h2>Admin login</h2>
            <p>Unlock generation and merge controls.</p>
            <label>
              Password
              <input name="password" type="password" autoFocus required />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary" type="submit">
              Enter studio
            </button>
          </form>
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
