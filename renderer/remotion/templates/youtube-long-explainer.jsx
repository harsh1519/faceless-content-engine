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
export const WIDTH = 1920;
export const HEIGHT = 1080;

const theme = {
  bg: "#020617",
  text: "#f8fafc",
  muted: "#cbd5e1",
  panel: "rgba(2, 6, 23, 0.68)",
  accent: "#38bdf8",
  accent2: "#a78bfa",
};

export function YoutubeLongExplainer({
  videoSrc,
  audioSrc,
  scenes = [],
  durationSeconds = 60,
}) {
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

      <AbsoluteFill style={styles.wash} />
      <div style={styles.leftGlow} />
      <div style={styles.frame} />
      <TopicBadge scene={activeScene} />

      {scenes.map((scene, index) => (
        <SceneLayer key={`${scene.start}-${index}`} scene={scene} index={index} />
      ))}

      <Progress progress={progress} />
    </AbsoluteFill>
  );
}

function SceneLayer({ scene, index }) {
  const { fps } = useVideoConfig();
  const from = Math.max(0, Math.floor((scene.start ?? 0) * fps));
  const duration = Math.max(
    1,
    Math.ceil(((scene.end ?? scene.start + 4) - (scene.start ?? 0)) * fps)
  );

  return (
    <Sequence from={from} durationInFrames={duration}>
      <SceneCard scene={scene} index={index} />
    </Sequence>
  );
}

function SceneCard({ scene, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(entrance, [0, 1], [26, 0]);
  const accent = index % 2 === 0 ? theme.accent : theme.accent2;

  return (
    <AbsoluteFill>
      {scene.showOverlay ? (
        <div style={{ ...styles.sectionCard, opacity, transform: `translateY(${y}px)` }}>
          <div style={{ ...styles.sectionRule, background: accent }} />
          <div style={styles.sectionKicker}>KEY IDEA</div>
          <div style={styles.sectionTitle}>{scene.overlayText}</div>
        </div>
      ) : null}

      <div style={{ ...styles.captionPanel, opacity, transform: `translateY(${-y * 0.4}px)` }}>
        <div style={styles.caption}>{scene.captionText}</div>
      </div>
    </AbsoluteFill>
  );
}

function TopicBadge({ scene }) {
  return (
    <div style={styles.topicBadge}>
      <span style={styles.badgeDot} />
      <span>{scene?.visualTreatment?.replace("_", " ") || "explainer"}</span>
    </div>
  );
}

function Progress({ progress }) {
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

const styles = {
  root: {
    backgroundColor: theme.bg,
    color: theme.text,
    fontFamily: "Inter, Arial, Helvetica, sans-serif",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "contrast(1.08) saturate(1.08)",
  },
  fallbackBackground: {
    width: "100%",
    height: "100%",
    background:
      "radial-gradient(circle at 20% 30%, rgba(56,189,248,0.28), transparent 36%), radial-gradient(circle at 82% 70%, rgba(167,139,250,0.24), transparent 34%), #020617",
  },
  wash: {
    background:
      "linear-gradient(90deg, rgba(2,6,23,0.58), rgba(2,6,23,0.10) 48%, rgba(2,6,23,0.62))",
  },
  leftGlow: {
    position: "absolute",
    left: -260,
    top: 120,
    width: 620,
    height: 620,
    borderRadius: 999,
    background: "rgba(56,189,248,0.18)",
    filter: "blur(120px)",
  },
  frame: {
    position: "absolute",
    inset: 34,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 28,
    boxShadow: "0 0 90px rgba(0,0,0,0.36) inset",
  },
  topicBadge: {
    position: "absolute",
    top: 58,
    left: 66,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 20px",
    borderRadius: 999,
    background: theme.panel,
    border: "1px solid rgba(255,255,255,0.14)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontSize: 18,
    fontWeight: 850,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: theme.accent,
    boxShadow: `0 0 18px ${theme.accent}`,
  },
  sectionCard: {
    position: "absolute",
    left: 78,
    top: 164,
    width: 580,
    padding: "28px 34px 30px 46px",
    borderRadius: 28,
    background: "rgba(2,6,23,0.72)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 24px 90px rgba(0,0,0,0.36)",
  },
  sectionRule: {
    position: "absolute",
    left: 24,
    top: 26,
    bottom: 26,
    width: 7,
    borderRadius: 99,
  },
  sectionKicker: {
    fontSize: 17,
    color: theme.muted,
    fontWeight: 900,
    letterSpacing: 3,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 44,
    fontWeight: 950,
    lineHeight: 1.02,
    letterSpacing: -1.2,
    textTransform: "uppercase",
  },
  captionPanel: {
    position: "absolute",
    left: 250,
    right: 250,
    bottom: 68,
    padding: "22px 32px",
    borderRadius: 22,
    background: "rgba(2,6,23,0.58)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  caption: {
    fontSize: 38,
    lineHeight: 1.12,
    fontWeight: 850,
    letterSpacing: -0.6,
    textAlign: "center",
    textShadow: "0 4px 22px rgba(0,0,0,0.56)",
  },
  progressTrack: {
    position: "absolute",
    left: 90,
    right: 90,
    bottom: 34,
    height: 6,
    borderRadius: 99,
    background: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`,
  },
};
