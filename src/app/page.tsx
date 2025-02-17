"use client";

import dynamic from "next/dynamic";

const MapNoSSR = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  return (
    <main className="col-content flex h-screen flex-col items-center justify-center">
      hello world
      <MapNoSSR />
    </main>
  );
}
