import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { pinFill, pinRadius, storeYear, type WaStore } from "../lib/waBoard";

type Props = {
  stores: WaStore[];
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function WaBoard({ stores, selected, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selected);
  onSelectRef.current = onSelect;
  selectedRef.current = selected;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    const map = L.map(host, {
      scrollWheelZoom: true,
      zoomControl: true,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    window.requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current.clear();
    const maxWins = Math.max(0, ...stores.map((s) => s.wins));
    const bounds: L.LatLngTuple[] = [];

    for (const store of stores) {
      const on = selectedRef.current === store.id;
      const year = storeYear(store);
      const lng = pinLng(store);
      const marker = L.circleMarker([store.lat, lng], {
        radius: pinRadius(store.wins, maxWins) + (on ? 2 : 0),
        color: on ? "#fafafa" : "#09090b",
        weight: on ? 2 : 1,
        fillColor: pinFill(store),
        fillOpacity: 0.92,
      });
      const maps = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
      const localJackpot =
        store.kind === "jackpot" &&
        (store.game === "hit5" || store.game === "lotto");
      const winsLine = localJackpot
        ? `${esc(store.game === "hit5" ? "Hit 5 cashpot" : "Lotto jackpot")}${store.date ? ` · ${esc(store.date)}` : ""}${store.shares && store.shares > 1 ? ` · ${store.shares} tickets` : ""}`
        : store.kind === "jackpot"
          ? `${esc(store.name)} sold in ${esc(store.city)}${store.date ? ` · ${esc(store.date)}` : ""}`
          : `${store.wins} tickets of $1,000 or more in ${year}`;
      marker.bindPopup(
        `<p class="wa-pop-name">${esc(store.name)}</p>
         <p class="wa-pop-addr">${esc(store.address)}${store.kind === "jackpot" && !localJackpot ? "" : `, ${esc(store.city)}`}</p>
         <p class="wa-pop-wins">${winsLine}</p>
         <a class="wa-pop-dir" href="${maps}" target="_blank" rel="noopener noreferrer">Google Maps directions</a>`,
      );
      marker.on("click", () => {
        const current = selectedRef.current;
        onSelectRef.current(current === store.id ? null : store.id);
      });
      marker.addTo(layer);
      markersRef.current.set(store.id, marker);
      bounds.push([store.lat, store.lng]);
    }

    if (bounds.length === 0) return;
    if (!selectedRef.current) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 8 });
    }
    window.requestAnimationFrame(() => map.invalidateSize());
  }, [stores]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const maxWins = Math.max(0, ...stores.map((s) => s.wins));
    markersRef.current.forEach((marker, id) => {
      const store = stores.find((s) => s.id === id);
      if (!store) return;
      const on = selected === id;
      marker.setStyle({
        radius: pinRadius(store.wins, maxWins) + (on ? 2 : 0),
        color: on ? "#fafafa" : "#09090b",
        weight: on ? 2 : 1,
        fillColor: pinFill(store),
        fillOpacity: 0.92,
      });
    });
    if (!selected) {
      map.closePopup();
      return;
    }
    const store = stores.find((s) => s.id === selected);
    const marker = store ? markersRef.current.get(store.id) : undefined;
    if (!store || !marker) return;
    map.flyTo(
      [
        store.lat,
        pinLng(store),
      ],
      Math.max(map.getZoom(), 13),
      {
        duration: 0.45,
      },
    );
    marker.openPopup();
  }, [selected, stores]);

  return (
    <div
      ref={hostRef}
      className="wa-board"
      role="application"
      aria-label="Washington street map of lottery ticket sale locations"
    />
  );
}

function pinLng(store: WaStore): number {
  if (store.kind !== "jackpot") {
    return store.lng + (storeYear(store) - 2024) * 0.0016;
  }
  const n = [...store.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return store.lng + ((n % 5) - 2) * 0.0007;
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
