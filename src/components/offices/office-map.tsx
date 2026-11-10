'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '@/components/i18n-provider';

export type MapOffice = { slug: string; name: string; lat: number; lng: number; approximate: boolean; href: string };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Groups offices sharing coordinates (e.g. approximate city centres) into one marker. */
function group(offices: MapOffice[]) {
  const m = new Map<string, MapOffice[]>();
  for (const o of offices) {
    const k = `${o.lat.toFixed(4)},${o.lng.toFixed(4)}`;
    m.set(k, [...(m.get(k) ?? []), o]);
  }
  return [...m.values()];
}

function popupHtml(items: MapOffice[], approxLabel: string) {
  const links = items.map((o) => `<a href="${escapeHtml(o.href)}" style="display:block;font-weight:600;color:#101B2A;padding:2px 0">${escapeHtml(o.name)}</a>`).join('');
  const approx = items.some((o) => o.approximate) ? `<p style="margin:6px 0 0;font-size:11px;color:#5e6772;max-width:200px">${escapeHtml(approxLabel)}</p>` : '';
  return links + approx;
}

/**
 * Kakao Maps when NEXT_PUBLIC_KAKAO_MAP_KEY is set; otherwise Leaflet with
 * OpenStreetMap tiles (no key required). Markers link to office profiles.
 */
export function OfficeMap({ offices, heightClass = 'h-[520px]' }: { offices: MapOffice[]; heightClass?: string }) {
  const { t } = useI18n();
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  // stable dependency: the array prop gets a new identity on every render
  const key = JSON.stringify(offices);
  useEffect(() => {
    if (!el.current) return;
    let cancelled = false;
    let cleanup = () => {};
    const groups = group(JSON.parse(key) as MapOffice[]);

    if (kakaoKey) {
      const script = document.createElement('script');
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoKey)}&autoload=false`;
      script.onerror = () => setFailed(true);
      script.onload = () => {
        const kakao = (window as unknown as { kakao: any }).kakao; // eslint-disable-line @typescript-eslint/no-explicit-any
        kakao.maps.load(() => {
          const map = new kakao.maps.Map(el.current, { center: new kakao.maps.LatLng(36.4, 127.8), level: 13 });
          for (const g of groups) {
            const marker = new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(g[0].lat, g[0].lng), title: g.map((o) => o.name).join(', ') });
            const info = new kakao.maps.InfoWindow({ content: `<div style="padding:8px 10px">${popupHtml(g, t.directory.approximateLocation)}</div>`, removable: true });
            kakao.maps.event.addListener(marker, 'click', () => info.open(map, marker));
          }
        });
      };
      document.head.appendChild(script);
      cleanup = () => script.remove();
    } else {
      let map: import('leaflet').Map | null = null;
      import('leaflet')
        .then((mod) => {
          const L = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
          if (cancelled || !el.current) return;
          map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([36.2, 127.8], 7);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(map);
          const bounds: [number, number][] = [];
          for (const g of groups) {
            const icon = L.divIcon({
              className: '',
              html: `<span style="display:flex;align-items:center;justify-content:center;width:${g.length > 1 ? 30 : 22}px;height:${g.length > 1 ? 30 : 22}px;border-radius:999px;background:#101B2A;color:#fff;font:600 12px Inter,sans-serif;box-shadow:0 0 0 4px rgba(84,121,155,.35)">${g.length > 1 ? g.length : ''}</span>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });
            const marker = L.marker([g[0].lat, g[0].lng], { icon, title: g.map((o) => o.name).join(', '), keyboard: true, alt: g.map((o) => o.name).join(', ') }).addTo(map);
            marker.bindPopup(popupHtml(g, t.directory.approximateLocation));
            bounds.push([g[0].lat, g[0].lng]);
          }
          if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate: false });
          else if (bounds.length === 1) map.setView(bounds[0], 11, { animate: false });
        })
        .catch((e) => { console.error('map init failed', e); setFailed(true); });
      cleanup = () => {
        cancelled = true;
        map?.remove();
      };
    }
    return () => cleanup();
  }, [key, kakaoKey, t.directory.approximateLocation]);

  if (failed) return <p className="rounded-[var(--radius-lg)] border border-line bg-white p-6 text-sm text-muted-text">{t.directory.mapUnavailable}</p>;
  return <div ref={el} role="region" aria-label={t.directory.mapLabel} className={`${heightClass} w-full overflow-hidden rounded-[var(--radius-lg)] border border-line`} />;
}
