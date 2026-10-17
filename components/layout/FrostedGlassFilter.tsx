"use client";

import React from "react";

const FrostedGlassFilter = () => {
    return (
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
            <defs>
                <filter id="frosted" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
                    {/* Generative Noise to mimic the frosted texture - extremely lightweight */}
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.85"
                        numOctaves="3"
                        stitchTiles="stitch"
                        result="noise"
                    />
                    {/* Blur the noise slightly for softness */}
                    <feGaussianBlur in="noise" stdDeviation="0.5" result="softNoise" />

                    {/* Use noise to displace the background content */}
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="softNoise"
                        scale="25"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </defs>
        </svg>
    );
};

export default FrostedGlassFilter;
