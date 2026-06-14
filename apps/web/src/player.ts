import * as Tone from "tone";
import type { AgentRole, MusicPart, Song } from "@collabjam/shared";

type Player = {
  stop: () => void;
  setMuted: (role: AgentRole, muted: boolean) => void;
};

function beatsPerBar(song: Song) {
  return Number(song.timeSignature.split("/")[0] ?? 4) || 4;
}

function positionToSeconds(position: string, song: Song) {
  const [bar = 0, beat = 0, sixteenth = 0] = position.split(":").map(Number);
  const beatSeconds = 60 / song.bpm;
  return (bar * beatsPerBar(song) + beat + sixteenth / 4) * beatSeconds;
}

function durationToSeconds(duration: string, song: Song) {
  const beatSeconds = 60 / song.bpm;
  if (duration.endsWith("m")) {
    return Number(duration.slice(0, -1)) * beatsPerBar(song) * beatSeconds;
  }
  if (duration.endsWith("n")) {
    return (4 / Number(duration.slice(0, -1))) * beatSeconds;
  }
  if (duration.includes(":")) return positionToSeconds(duration, song);
  return beatSeconds / 2;
}

export async function playProduction(
  song: Song,
  parts: MusicPart[],
  muted: Set<AgentRole>,
  onStop: () => void
): Promise<Player> {
  await Tone.start();
  await Tone.loaded();
  if (Tone.getContext().state !== "running") {
    await Tone.getContext().resume();
  }

  const channels = {
    rhythm: new Tone.Channel({
      volume: -5,
      mute: muted.has("rhythm")
    }).toDestination(),
    harmony: new Tone.Channel({
      volume: -12,
      mute: muted.has("harmony")
    }).toDestination(),
    bass: new Tone.Channel({
      volume: -7,
      mute: muted.has("bass")
    }).toDestination()
  };
  const kick = new Tone.MembraneSynth().connect(channels.rhythm);
  const hat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 3000,
    octaves: 1.5
  }).connect(channels.rhythm);
  const harmony = new Tone.PolySynth(Tone.Synth).connect(channels.harmony);
  const bass = new Tone.MonoSynth({
    oscillator: { type: "square" },
    filterEnvelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.3,
      release: 0.5,
      baseFrequency: 90,
      octaves: 2
    }
  }).connect(channels.bass);

  const startAt = Tone.now() + 0.08;
  for (const part of parts) {
    for (const event of part.events) {
      const time = startAt + positionToSeconds(event.time, song);
      const duration = durationToSeconds(event.duration, song);
      if (part.role === "rhythm") {
        if (event.note === "F#1") {
          hat.triggerAttackRelease(duration, time, event.velocity);
        } else {
          kick.triggerAttackRelease(event.note, duration, time, event.velocity);
        }
      } else if (part.role === "harmony") {
        harmony.triggerAttackRelease(
          event.note,
          duration,
          time,
          event.velocity
        );
      } else {
        bass.triggerAttackRelease(event.note, duration, time, event.velocity);
      }
    }
  }

  const bars = Math.max(...parts.map((part) => part.bars), 1);
  const stopTimer = window.setTimeout(
    () => {
      player.stop();
      onStop();
    },
    (positionToSeconds(`${bars}:0:0`, song) + 0.25) * 1000
  );

  const player: Player = {
    stop() {
      window.clearTimeout(stopTimer);
      kick.dispose();
      hat.dispose();
      harmony.dispose();
      bass.dispose();
      Object.values(channels).forEach((channel) => channel.dispose());
    },
    setMuted(role, isMuted) {
      channels[role].mute = isMuted;
    }
  };

  if (!parts.some((part) => part.events.length > 0)) {
    const preview = new Tone.Synth().toDestination();
    preview.triggerAttackRelease("C4", 0.15, startAt, 0.35);
    window.setTimeout(() => preview.dispose(), 500);
  }

  return player;
}
