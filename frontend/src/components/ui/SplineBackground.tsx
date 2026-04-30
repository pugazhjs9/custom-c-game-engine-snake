'use client';

import Spline from '@splinetool/react-spline';
import { Suspense } from 'react';

export default function SplineBackground() {
  return (
    <div className="fixed inset-0 -z-10 w-full h-full pointer-events-none overflow-hidden">
      <Suspense fallback={<div className="w-full h-full bg-slate-950" />}>
        <Spline
          scene="https://prod.spline.design/DAd1twSBUvD8CGQK/scene.splinecode"
          className="w-full h-full"
        />
      </Suspense>
      {/* Gradient overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/80 pointer-events-none" />
    </div>
  );
}
