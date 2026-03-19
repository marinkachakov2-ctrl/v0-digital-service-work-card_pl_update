"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";

interface DTCCode {
  code: string;
  severity: string;
  description: string;
}

interface Telematics {
  fuelLevel: number;
  engineRPM: number;
  groundSpeed: number;
}

interface Tractor {
  id: string;
  name: string;
  model: string;
  location: string;
  position: { lat: number; lng: number };
  status: "active" | "warning" | "idle" | "critical";
  telematics: Telematics;
  dtcCodes: DTCCode[];
}

interface FleetMapProps {
  tractors: Tractor[];
  selectedTractorId: string | null;
  onSelectTractor: (id: string) => void;
}

// Tile layer URLs - reliable CartoDB servers for both themes
const TILE_LAYERS = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  presentation: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

const TILE_ATTRIBUTIONS = {
  dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  light: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  presentation: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

// Status colors
const STATUS_COLORS = {
  active: "#367C2B", // Megatron Green
  warning: "#FFDE00", // JD Yellow
  idle: "#6B7280", // Gray
  critical: "#FF3B30", // Red
};

export default function FleetMap({ tractors, selectedTractorId, onSelectTractor }: FleetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current theme for map
  const currentTheme = mounted ? (theme as keyof typeof TILE_LAYERS) || "dark" : "dark";
  const isLightTheme = currentTheme === "light" || currentTheme === "presentation";

  // Initialize map - recreate when theme changes to force tile refresh
  useEffect(() => {
    if (!mapRef.current || !mounted) return;

    // Destroy existing map if present
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersRef.current.clear();
    }

    const map = L.map(mapRef.current, {
      center: [42.7339, 25.4858], // Center of Bulgaria
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    // Tile layer with proper attribution based on current theme
    const themeKey = (currentTheme in TILE_LAYERS ? currentTheme : "dark") as keyof typeof TILE_LAYERS;
    const tileUrl = TILE_LAYERS[themeKey];
    const tileAttribution = TILE_ATTRIBUTIONS[themeKey];
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: tileAttribution,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, [currentTheme, mounted]);

  // Create/update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mounted) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    tractors.forEach((tractor) => {
      const isSelected = selectedTractorId === tractor.id;
      const color = STATUS_COLORS[tractor.status];
      const isCritical = tractor.status === "critical";
      const isActive = tractor.status === "active";

      // Marker size
      const size = isSelected ? 32 : 24;

      // Create custom marker icon
      const iconHtml = `
        <div class="tractor-marker ${isCritical ? 'critical-pulse' : ''}" style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 3px solid ${isSelected ? "#fff" : "rgba(255,255,255,0.7)"};
          border-radius: 50%;
          box-shadow: 0 0 ${isSelected ? "20px" : "12px"} ${color}${isSelected ? "" : "80"};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? "10px" : "8px"};
          font-weight: bold;
          color: ${tractor.status === "warning" ? "#000" : "#fff"};
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        ">JD</div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: "custom-tractor-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      // Create popup content
      const popupContent = `
        <div class="fleet-popup ${isLightTheme ? 'light-theme' : 'dark-theme'}">
          <div class="popup-header">
            <span class="popup-model">${tractor.model}</span>
            <span class="popup-status" style="background: ${color}; color: ${tractor.status === "warning" ? "#000" : "#fff"};">
              ${tractor.status.toUpperCase()}
            </span>
          </div>
          <div class="popup-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            ${tractor.location}
          </div>
          <div class="popup-telemetrics">
            <div class="telemetric-item">
              <span class="telemetric-label">Fuel</span>
              <div class="telemetric-bar">
                <div class="telemetric-fill fuel" style="width: ${tractor.telematics.fuelLevel}%"></div>
              </div>
              <span class="telemetric-value">${tractor.telematics.fuelLevel}%</span>
            </div>
            <div class="telemetric-row">
              <div class="telemetric-digital">
                <span class="digital-label">RPM</span>
                <span class="digital-value">${tractor.telematics.engineRPM}</span>
              </div>
              <div class="telemetric-digital">
                <span class="digital-label">Speed</span>
                <span class="digital-value">${tractor.telematics.groundSpeed} <small>km/h</small></span>
              </div>
            </div>
          </div>
          ${tractor.dtcCodes.length > 0 ? `
            <div class="popup-dtc">
              <span class="dtc-label">Active DTCs (${tractor.dtcCodes.length})</span>
              ${tractor.dtcCodes.map(dtc => `
                <div class="dtc-item ${dtc.severity}">
                  <span class="dtc-code">${dtc.code}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

      const marker = L.marker([tractor.position.lat, tractor.position.lng], { icon })
        .bindPopup(popupContent, {
          className: `fleet-popup-container ${isLightTheme ? 'light' : 'dark'}`,
          closeButton: false,
          offset: [0, -size / 2],
        })
        .addTo(map)
        .on("click", () => onSelectTractor(tractor.id));

      // Add outer glow ring for active/critical
      if (isActive || isCritical || isSelected) {
        const glowSize = size + 20;
        const glowHtml = `
          <div class="${isCritical ? 'critical-glow' : 'active-glow'}" style="
            width: ${glowSize}px;
            height: ${glowSize}px;
            background: ${color};
            border-radius: 50%;
            opacity: 0.25;
          "></div>
        `;
        const glowIcon = L.divIcon({
          html: glowHtml,
          className: "glow-marker",
          iconSize: [glowSize, glowSize],
          iconAnchor: [glowSize / 2, glowSize / 2],
        });
        const glowMarker = L.marker([tractor.position.lat, tractor.position.lng], {
          icon: glowIcon,
          interactive: false,
          zIndexOffset: -1,
        }).addTo(map);
        markersRef.current.set(`${tractor.id}-glow`, glowMarker);
      }

      markersRef.current.set(tractor.id, marker);
    });

    // Center on selected tractor
    if (selectedTractorId) {
      const selected = tractors.find((t) => t.id === selectedTractorId);
      if (selected) {
        map.setView([selected.position.lat, selected.position.lng], Math.max(map.getZoom(), 8), {
          animate: true,
          duration: 0.5,
        });
      }
    }
  }, [tractors, selectedTractorId, onSelectTractor, mounted, isLightTheme]);

  const bgColor = isLightTheme ? "#f5f5f5" : "#0a0f14";

  return (
    <>
      <style jsx global>{`
        .custom-tractor-marker,
        .glow-marker {
          background: transparent !important;
          border: none !important;
        }

        .critical-pulse {
          animation: critical-pulse 1.5s ease-in-out infinite;
        }

        .critical-glow {
          animation: glow-pulse 1.5s ease-in-out infinite;
        }

        .active-glow {
          animation: glow-pulse 2.5s ease-in-out infinite;
        }

        @keyframes critical-pulse {
          0%, 100% { box-shadow: 0 0 12px #FF3B30; }
          50% { box-shadow: 0 0 25px #FF3B30, 0 0 40px #FF3B30; }
        }

        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.3); opacity: 0; }
        }

        /* Leaflet controls theming */
        .leaflet-control-zoom {
          border: 1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: ${isLightTheme ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.8)"} !important;
          color: ${isLightTheme ? "#333" : "#fff"} !important;
          border-bottom: 1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} !important;
        }
        .leaflet-control-zoom a:hover {
          background: ${isLightTheme ? "rgba(240,240,240,0.95)" : "rgba(30,30,30,0.9)"} !important;
        }
        .leaflet-control-attribution {
          background: ${isLightTheme ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)"} !important;
          color: ${isLightTheme ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.5)"} !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a {
          color: ${isLightTheme ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.6)"} !important;
        }

        /* Popup styling */
        .fleet-popup-container .leaflet-popup-content-wrapper {
          background: ${isLightTheme ? "#ffffff" : "#1a1a1a"} !important;
          border: 1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,${isLightTheme ? "0.15" : "0.5"}) !important;
          padding: 0 !important;
        }
        .fleet-popup-container .leaflet-popup-tip {
          background: ${isLightTheme ? "#ffffff" : "#1a1a1a"} !important;
          border: 1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} !important;
        }
        .fleet-popup-container .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }

        .fleet-popup {
          padding: 12px 14px;
          min-width: 200px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .fleet-popup.dark-theme {
          color: #fff;
        }
        .fleet-popup.light-theme {
          color: #1a1a1a;
        }
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .popup-model {
          font-weight: 700;
          font-size: 14px;
        }
        .popup-status {
          font-size: 9px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .popup-location {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.7;
          margin-bottom: 12px;
        }
        .popup-telemetrics {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .telemetric-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .telemetric-label {
          font-size: 10px;
          opacity: 0.6;
          width: 30px;
        }
        .telemetric-bar {
          flex: 1;
          height: 6px;
          background: ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"};
          border-radius: 3px;
          overflow: hidden;
        }
        .telemetric-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .telemetric-fill.fuel {
          background: linear-gradient(90deg, #ef4444 0%, #f59e0b 30%, #367C2B 60%);
          background-size: 200% 100%;
          background-position: calc(100% - var(--fuel-level, 100%)) 0;
        }
        .telemetric-value {
          font-size: 11px;
          font-weight: 600;
          font-family: 'SF Mono', 'Fira Code', monospace;
          width: 35px;
          text-align: right;
        }
        .telemetric-row {
          display: flex;
          gap: 16px;
        }
        .telemetric-digital {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .digital-label {
          font-size: 9px;
          opacity: 0.5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .digital-value {
          font-size: 16px;
          font-weight: 700;
          font-family: 'SF Mono', 'Fira Code', monospace;
          color: #367C2B;
        }
        .digital-value small {
          font-size: 10px;
          opacity: 0.6;
        }
        .popup-dtc {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"};
        }
        .dtc-label {
          font-size: 10px;
          font-weight: 600;
          color: #FF3B30;
          display: block;
          margin-bottom: 6px;
        }
        .dtc-item {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          margin-bottom: 4px;
        }
        .dtc-item.critical {
          background: rgba(255, 59, 48, 0.15);
          border-left: 3px solid #FF3B30;
        }
        .dtc-item.warning {
          background: rgba(255, 222, 0, 0.15);
          border-left: 3px solid #FFDE00;
        }
        .dtc-code {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 10px;
        }
      `}</style>
      <div 
        ref={mapRef} 
        className="w-full h-full" 
        style={{ 
          background: bgColor, 
          zIndex: 1,
          minHeight: "400px",
        }} 
      />
    </>
  );
}
