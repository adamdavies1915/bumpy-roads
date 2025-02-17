"use client";

import "leaflet";
import "./map.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";

const Map = () => {
  return (
    <div className="w-full">
      <MapContainer
        center={[45.37, 10.585]}
        zoom={13}
        scrollWheelZoom={false}
        // ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <TileLayer url="/api/tiles/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  );
};

export default Map;
