"use client";

import dynamic from "next/dynamic";

const MapNoSSR = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  return (
    <main className="col-content h-screen justify-center items-center flex flex-col">
      hello world
      <MapNoSSR />
    </main>
  );
}
