import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

const theme = {
  white: "#ffffff",
  text: "#f8fafc",
  muted: "#cbd5e1",
  panel: "rgba(5, 8, 18, 0.72)",
  panelSoft: "rgba(15, 23, 42, 0.52)",
  accent: "#8b5cf6",
  accent2: "#06b6d4",
  hot: "#f97316",
};

export function InvideoShort({ videoSrc, audioSrc, scenes = [], durationSeconds = 30 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = Math.max(1, Math.ceil(durationSeconds * fps));
  const progress = Math.min(frame / durationFrames, 1);
  const activeScene = getActiveScene(scenes, frame, fps);

  return (
    <AbsoluteFill style={styles.root}>
      <AbsoluteFill>
        {videoSrc ? (
          <OffthreadVideo src={videoSrc} style={styles.video} muted />
        ) : (
          <div style={styles.fallbackBackground} />
        )}
      </AbsoluteFill>

      {audioSrc ? <Audio src={audioSrc} /> : null}

      <AbsoluteFill style={styles.darkWash} />
      <div style={styles.topGlow} />
      <div style={styles.bottomGlow} />
      <div style={styles.frameLine} />

      {scenes.map((scene, index) => (
        <SceneLayer key={`${scene.start}-${index}`} scene={scene} index={index} />
      ))}

      <HookCard scene={scenes[0]} />
      <TopicPill scene={activeScene} />
      <ProgressBar progress={progress} />
    </AbsoluteFill>
  );
}

function SceneLayer({ scene, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const from = Math.max(0, Math.floor((scene.start ?? 0) * fps));
  const duration = Math.max(1, Math.ceil(((scene.end ?? scene.start + 2) - (scene.start ?? 0)) * fps));

  return (
    <Sequence from={from} durationInFrames={duration}>
      <SceneOverlay scene={scene} index={index} />
      {scene.patternInterrupt ? <PatternFlash frame={frame - from} /> : null}
    </Sequence>
  );
}

function SceneOverlay({ scene, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });
  const opacity = interpolate(frame, [0, 8, 999], [0, 1, 1], {
    extrapolateRight: "clamp",
  });
  const lift = interpolate(entrance, [0, 1], [34, 0]);
  const scale = interpolate(entrance, [0, 1], [0.96, 1]);
  const accent = index % 3 === 0 ? theme.accent : index % 3 === 1 ? theme.accent2 : theme.hot;

  return (
    <AbsoluteFill>
      <div
        style={{
          ...styles.overlayCard,
          opacity,
          transform: `translateY(${lift}px) scale(${scale})`,
          borderColor: `${accent}99`,
        }}
      >
        <div style={{ ...styles.accentBar, background: accent }} />
        <div style={styles.overlayText}>{scene.overlayText || shortText(scene.captionText)}</div>
      </div>

      <div
        style={{
          ...styles.captionCard,
          opacity,
          transform: `translateY(${-lift * 0.45}px)`,
        }}
      >
        <div style={styles.captionText}>{scene.captionText}</div>
      </div>
    </AbsoluteFill>
  );
}

function HookCard({ scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 16, stiffness: 130 } });
  const opacity = interpolate(frame, [0, 8, 34, 44], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(entrance, [0, 1], [0.82, 1]);

  if (!scene) return null;

  return (
    <div style={{ ...styles.hookCard, opacity, transform: `translate(-50%, -50%) scale(${scale})` }}>
      <div style={styles.hookKicker}>WATCH THIS</div>
      <div style={styles.hookTitle}>{scene.overlayText || shortText(scene.captionText)}</div>
    </div>
  );
}

function TopicPill({ scene }) {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 16), [-1, 1], [0.85, 1]);

  return (
    <div style={styles.topicPill}>
      <span style={{ ...styles.liveDot, opacity: pulse }} />
      <span>{scene?.visualTreatment?.replace("_", " ") || "premium reel"}</span>
    </div>
  );
}

function PatternFlash({ frame }) {
  const opacity = interpolate(frame, [0, 4, 10], [0.36, 0.12, 0], {
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ ...styles.flash, opacity }} />;
}

function ProgressBar({ progress }) {
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${Math.round(progress * 100)}%` }} />
    </div>
  );
}

function getActiveScene(scenes, frame, fps) {
  const seconds = frame / fps;
  return scenes.find((scene) => seconds >= scene.start && seconds <= scene.end) ?? scenes[0];
}

function shortText(text = "") {
  return text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 5)
    .join(" ");
}

const styles = {
  root: {
    backgroundColor: "#020617",
    fontFamily: "Inter, Arial, Helvetica, sans-serif",
    color: theme.text,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "contrast(1.1) saturate(1.15)",
  },
  fallbackBackground: {
    width: "100%",
    height: "100%",
    background:
      "radial-gradient(circle at 30% 20%, rgba(139,92,246,0.45), transparent 32%), radial-gradient(circle at 75% 75%, rgba(6,182,212,0.35), transparent 30%), #020617",
  },
  darkWash: {
    background:
      "linear-gradient(180deg, rgba(2,6,23,0.42) 0%, rgba(2,6,23,0.05) 38%, rgba(2,6,23,0.58) 100%)",
  },
  topGlow: {
    position: "absolute",
    top: -220,
    left: -140,
    width: 620,
    height: 620,
    borderRadius: 999,
    background: "rgba(139,92,246,0.34)",
    filter: "blur(120px)",
  },
  bottomGlow: {
    position: "absolute",
    bottom: -260,
    right: -160,
    width: 680,
    height: 680,
    borderRadius: 999,
    background: "rgba(6,182,212,0.28)",
    filter: "blur(130px)",
  },
  frameLine: {
    position: "absolute",
    inset: 34,
    borderRadius: 42,
    border: "2px solid rgba(255,255,255,0.10)",
    boxShadow: "0 0 80px rgba(0,0,0,0.42) inset",
  },
  hookCard: {
    position: "absolute",
    left: "50%",
    top: "49%",
    width: 850,
    padding: "42px 48px",
    borderRadius: 42,
    background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.76))",
    border: "2px solid rgba(255,255,255,0.18)",
    boxShadow: "0 28px 110px rgba(0,0,0,0.55)",
    textAlign: "center",
  },
  hookKicker: {
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 6,
    color: theme.accent2,
    marginBottom: 16,
  },
  hookTitle: {
    fontSize: 68,
    fontWeight: 950,
    lineHeight: 0.96,
    letterSpacing: -2,
    textTransform: "uppercase",
  },
  topicPill: {
    position: "absolute",
    top: 74,
    left: 74,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 22px",
    borderRadius: 999,
    background: theme.panel,
    border: "1px solid rgba(255,255,255,0.16)",
    fontSize: 24,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  liveDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: theme.accent2,
    boxShadow: `0 0 22px ${theme.accent2}`,
  },
  overlayCard: {
    position: "absolute",
    top: 155,
    right: 64,
    width: 720,
    padding: "24px 30px 24px 42px",
    borderRadius: 34,
    background: theme.panel,
    border: "2px solid rgba(255,255,255,0.14)",
    boxShadow: "0 20px 70px rgba(0,0,0,0.38)",
  },
  accentBar: {
    position: "absolute",
    left: 22,
    top: 22,
    bottom: 22,
    width: 8,
    borderRadius: 99,
  },
  overlayText: {
    fontSize: 42,
    fontWeight: 950,
    lineHeight: 1,
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  captionCard: {
    position: "absolute",
    left: 70,
    right: 70,
    bottom: 145,
    padding: "34px 42px",
    borderRadius: 38,
    background: "linear-gradient(135deg, rgba(2,6,23,0.84), rgba(15,23,42,0.72))",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 20px 90px rgba(0,0,0,0.5)",
  },
  captionText: {
    fontSize: 58,
    lineHeight: 1.04,
    fontWeight: 950,
    letterSpacing: -1.6,
    textShadow: "0 4px 22px rgba(0,0,0,0.65)",
  },
  progressTrack: {
    position: "absolute",
    left: 82,
    right: 82,
    bottom: 76,
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`,
  },
  flash: {
    background: "rgba(255,255,255,0.38)",
    mixBlendMode: "screen",
  },
};
