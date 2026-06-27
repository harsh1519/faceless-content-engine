import React from "react";
import { Composition } from "remotion";

import { InvideoShort, FPS, HEIGHT, WIDTH } from "./templates/invideo-short.jsx";

export function RemotionRoot() {
  return (
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
  );
}
