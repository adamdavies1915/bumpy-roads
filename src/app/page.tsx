"use client";

import dynamic from "next/dynamic";

const MapNoSSR = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  return (
    <main className="flex flex-col h-screen justify-center items-center">
      hello world
      <MapNoSSR />
    </main>
  );
}
