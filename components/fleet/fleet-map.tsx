"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Tractor {
  id: string;
  name: string;
  model: string;
  position: { lat: number; lng: number };
  status: string;
  dtcCodes: Array<{ code: string; severity: string; description: string }>;
}

interface FleetMapProps {
  tractors: Tractor[];
  selectedTractorId: string | null;
  onSelectTractor: (id: string) => void;
}

export default function FleetMap({ tractors, selectedTractorId, onSelectTractor }: FleetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Bulgaria
    const map = L.map(mapRef.current, {
      center: [42.7339, 25.4858], // Center of Bulgaria
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark theme tile layer (CartoDB Dark Matter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Add attribution in corner
    L.control.attribution({
      position: "bottomright",
    }).addTo(map);
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>');

    mapInstanceRef.current = map;

    // Cleanup on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Create/update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    tractors.forEach((tractor) => {
      const hasErrors = tractor.dtcCodes.some(d => d.severity === "critical");
      const hasWarnings = tractor.dtcCodes.some(d => d.severity === "warning");
      const isSelected = selectedTractorId === tractor.id;
      
      // Determine marker color
      let color = "#6b7280"; // gray for idle
      if (tractor.status === "active") color = "#22c55e"; // green
      if (hasWarnings) color = "#f59e0b"; // amber
      if (hasErrors) color = "#ef4444"; // red

      // Create custom icon - small professional pin
      const size = isSelected ? 28 : 20;
      const iconHtml = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 2px solid ${isSelected ? "#fff" : "rgba(255,255,255,0.5)"};
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5), ${isSelected ? `0 0 12px ${color}` : "none"};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? "9px" : "7px"};
          font-weight: bold;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: all 0.2s ease;
        ">JD</div>
        ${isSelected ? `
          <div style="
            position: absolute;
            top: ${size + 4}px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            border: 1px solid ${color};
            border-radius: 4px;
            padding: 4px 8px;
            white-space: nowrap;
            font-size: 10px;
            font-weight: 600;
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          ">${tractor.id}</div>
        ` : ""}
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: "custom-tractor-marker",
        iconSize: [size, isSelected ? size + 24 : size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([tractor.position.lat, tractor.position.lng], { icon })
        .addTo(map)
        .on("click", () => onSelectTractor(tractor.id));

      // Add pulsing animation for active/selected
      if (tractor.status === "active" || isSelected) {
        const pulseHtml = `
          <div style="
            width: ${size + 16}px;
            height: ${size + 16}px;
            background: ${color};
            border-radius: 50%;
            opacity: 0.3;
            animation: pulse 2s ease-in-out infinite;
          "></div>
        `;
        const pulseIcon = L.divIcon({
          html: pulseHtml,
          className: "pulse-marker",
          iconSize: [size + 16, size + 16],
          iconAnchor: [(size + 16) / 2, (size + 16) / 2],
        });
        const pulseMarker = L.marker([tractor.position.lat, tractor.position.lng], { 
          icon: pulseIcon,
          interactive: false,
          zIndexOffset: -1,
        }).addTo(map);
        markersRef.current.set(`${tractor.id}-pulse`, pulseMarker);
      }

      markersRef.current.set(tractor.id, marker);
    });

    // Center on selected tractor
    if (selectedTractorId) {
      const selected = tractors.find(t => t.id === selectedTractorId);
      if (selected) {
        map.setView([selected.position.lat, selected.position.lng], map.getZoom(), {
          animate: true,
          duration: 0.5,
        });
      }
    }
  }, [tractors, selectedTractorId, onSelectTractor]);

  return (
    <>
      <style jsx global>{`
        .custom-tractor-marker {
          background: transparent !important;
          border: none !important;
        }
        .pulse-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.4); opacity: 0; }
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: rgba(0,0,0,0.8) !important;
          color: #fff !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30,30,30,0.9) !important;
        }
        .leaflet-control-attribution {
          background: rgba(0,0,0,0.6) !important;
          color: rgba(255,255,255,0.5) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a {
          color: rgba(255,255,255,0.6) !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" style={{ background: "#0a0f14" }} />
    </>
  );
}
