"use client";

import { Globe } from "@/shared/shadcn/components/ui/globe";
import { memo } from "react";

const AuthGlobe = memo(({ title }: { title?: string }) => {
  return (
    <div className="flex-1 h-full md:static absolute w-full -z-10  overflow-hidden">
      <div className=" relative max-w-full max-h-full  h-full  ">
        <h1 className="relative top-20  pointer-events-none  bg-linear-to-b from-black to-gray-300 bg-clip-text text-center text-8xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10">
          {title || "Welcome."}
        </h1>
        <Globe
          config={{
            devicePixelRatio: 2,
            width: 1000,
            height: 1000,
            phi: 0,
            theta: 0,
            dark: 0,
            diffuse: 1.2,
            scale: 1,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [1, 1, 1],
            markerColor: [1, 0.5, 1],
            glowColor: [1, 1, 1],
            offset: [0, 0],
            markers: [{ location: [23.97565, 120.9738819], size: 0.1 }],
            onRender: () => {},
          }}
          className=" scale-150 top-60 pointer-events-none"
        />
      </div>
    </div>
  );
});
AuthGlobe.displayName = "AuthGlobe";
export default AuthGlobe;
