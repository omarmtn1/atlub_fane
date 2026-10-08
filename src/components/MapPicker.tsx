import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Crosshair, Check } from 'lucide-react';
import { LocationInfo } from '../types';

interface MapPickerProps {
  initialLocation?: LocationInfo;
  onSelectLocation: (location: LocationInfo) => void;
  onClose?: () => void;
}

// Sample recognizable city landmarks/neighborhoods
const PRESET_DISTRICTS = [
  { name: 'حي النرجس، الرياض', city: 'الرياض', lat: 24.821, lng: 46.685 },
  { name: 'حي العليا، الرياض', city: 'الرياض', lat: 24.7136, lng: 46.6753 },
  { name: 'حي الروضة، جدة', city: 'جدة', lat: 21.573, lng: 39.155 },
  { name: 'حي الدقي، الجيزة', city: 'القاهرة', lat: 30.038, lng: 31.211 },
  { name: 'المنصور، بغداد', city: 'بغداد', lat: 33.312, lng: 44.354 },
  { name: 'الشميساني، عمّان', city: 'عمّان', lat: 31.973, lng: 35.895 },
];

export const MapPicker: React.FC<MapPickerProps> = ({
  initialLocation,
  onSelectLocation,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [currentLoc, setCurrentLoc] = useState<LocationInfo>(
    initialLocation || {
      lat: 24.7136,
      lng: 46.6753,
      address: 'شارع الملك فهد، حي العليا',
      city: 'الرياض',
    }
  );
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLoc.lat, currentLoc.lng],
        zoom: 14,
        zoomControl: false,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Android style pin icon
      const customIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
            <div style="background: #10b981; color: #022c22; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space: nowrap; border: 2px solid #ffffff; margin-bottom: 2px;">
              موقع الزبون 📍
            </div>
            <div style="width: 24px; height: 24px; background: #059669; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.4);"></div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });

      const marker = L.marker([currentLoc.lat, currentLoc.lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      // Click to place marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updateLocationFromCoords(lat, lng);
      });

      // Drag marker
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateLocationFromCoords(pos.lat, pos.lng);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const updateLocationFromCoords = (lat: number, lng: number) => {
    // Generate readable address format
    const readableLat = lat.toFixed(4);
    const readableLng = lng.toFixed(4);
    
    // Find closest preset or synthesize address
    let detectedAddress = `موقع محدد (${readableLat}, ${readableLng})`;
    let detectedCity = currentLoc.city || 'الرياض';

    for (const p of PRESET_DISTRICTS) {
      const dist = Math.hypot(p.lat - lat, p.lng - lng);
      if (dist < 0.08) {
        detectedAddress = `قرب ${p.name}`;
        detectedCity = p.city;
        break;
      }
    }

    const updated: LocationInfo = {
      lat,
      lng,
      address: detectedAddress,
      city: detectedCity,
    };
    setCurrentLoc(updated);
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 16);
            markerRef.current.setLatLng([latitude, longitude]);
          }
          updateLocationFromCoords(latitude, longitude);
          setIsLocating(false);
        },
        () => {
          // Fallback if denied
          setIsLocating(false);
          alert('تعذر الوصول إلى GPS. يمكنك النقر على الخريطة مباشرة لتحديد موقعك.');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleSelectPreset = (district: typeof PRESET_DISTRICTS[0]) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([district.lat, district.lng], 15);
      markerRef.current.setLatLng([district.lat, district.lng]);
    }
    const updated: LocationInfo = {
      lat: district.lat,
      lng: district.lng,
      address: district.name,
      city: district.city,
    };
    setCurrentLoc(updated);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs">تحديد موقع المشكلة على الخريطة</h4>
            <p className="text-[10px] text-slate-400">انقر على الخريطة أو حرك المؤشر لتحديد موقعك</p>
          </div>
        </div>
        <button
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
          title="موقعي الحالي عبر GPS"
        >
          <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'جاري التحديد...' : 'موقعي'}</span>
        </button>
      </div>

      {/* Quick Preset Selector */}
      <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
        <span className="text-slate-400 whitespace-nowrap pl-1">أحياء مقترحة:</span>
        {PRESET_DISTRICTS.map((dist, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectPreset(dist)}
            className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap border border-slate-700 transition-colors"
          >
            {dist.name}
          </button>
        ))}
      </div>

      {/* Map Canvas */}
      <div className="relative flex-1 min-h-[220px]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      {/* Bottom Bar: Selected Address & Confirm */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1 truncate">
            <span className="text-slate-400 text-[10px] block">العنوان المختار:</span>
            <span className="font-bold text-white text-xs truncate block">{currentLoc.address} ({currentLoc.city})</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onSelectLocation(currentLoc);
              if (onClose) onClose();
            }}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد هذا الموقع للطلب</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
