import React from "react";
import { Composition } from "remotion";

import { InvideoShort, FPS, HEIGHT, WIDTH } from "./templates/invideo-short.jsx";
import {
  YoutubeLongExplainer,
  FPS as LONG_FPS,
  HEIGHT as LONG_HEIGHT,
  WIDTH as LONG_WIDTH,
} from "./templates/youtube-long-explainer.jsx";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="InvideoShort"
        component={InvideoShort}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        durationInFrames={FPS * 30}
        defaultProps={{
          durationSeconds: 30,
          scenes: [],
          videoSrc: "",
          audioSrc: "",
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(1, Math.ceil((props.durationSeconds ?? 30) * FPS)),
        })}
      />
      <Composition
        id="YoutubeLongExplainer"
        component={YoutubeLongExplainer}
        fps={LONG_FPS}
        width={LONG_WIDTH}
        height={LONG_HEIGHT}
        durationInFrames={LONG_FPS * 60}
        defaultProps={{
          durationSeconds: 60,
          scenes: [],
          videoSrc: "",
          audioSrc: "",
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(1, Math.ceil((props.durationSeconds ?? 60) * LONG_FPS)),
        })}
      />
    </>
  );
}
