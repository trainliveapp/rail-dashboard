import { useState, useEffect, useRef } from "react";
import { ImagePlus, X, MapPin, Minus, Plus } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "../supabase";

const CENTER = [51.5074, -0.1278];

const lines = [
  { id: "bakerloo", name: "Bakerloo", color: "#B36305" },
  { id: "central", name: "Central", color: "#E32017" },
  { id: "circle", name: "Circle", color: "#FFD300" },
  { id: "district", name: "District", color: "#00782A" },
  { id: "hammersmith-city", name: "Hammersmith & City", color: "#F3A9BB" },
  { id: "jubilee", name: "Jubilee", color: "#A0A5A9" },
  { id: "metropolitan", name: "Metropolitan", color: "#9B0056" },
  { id: "northern", name: "Northern", color: "#000000" },
  { id: "piccadilly", name: "Piccadilly", color: "#003688" },
  { id: "victoria", name: "Victoria", color: "#0098D4" },
  { id: "waterloo-city", name: "Waterloo & City", color: "#95CDBA" },
  { id: "elizabeth", name: "Elizabeth", color: "#6950A1" },
  { id: "dlr", name: "DLR", color: "#00A4A7" },
  { id: "overground", name: "Overground", color: "#EE7C0E" },
  { id: "tram", name: "Tram", color: "#84B817" },
];

const trainIcon = L.divIcon({
  html: `
    <div style="
      width:22px;
      height:22px;
      background:#2563eb;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 7px rgba(0,0,0,.45);
    "></div>
  `,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const userIcon = L.divIcon({
  html: `
    <div style="
      width:22px;
      height:22px;
      background:#2563eb;
      border:4px solid white;
      border-radius:50%;
      box-shadow:0 2px 10px rgba(0,0,0,.55);
      position:relative;
    ">
      <div style="
        position:absolute;
        width:7px;
        height:7px;
        background:white;
        border-radius:50%;
        left:4px;
        top:4px;
      "></div>
    </div>
  `,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

/* -----------------------------------------------------------
 * MAP BRIDGE - exposes leaflet map instance via ref
 * --------------------------------------------------------- */
function MapBridge({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    if (mapRef) mapRef.current = map;
    return () => {
      if (mapRef) mapRef.current = null;
    };
  }, [map, mapRef]);

  return null;
}

/* -----------------------------------------------------------
 * MAIN MAP PANEL
 *
 * Accepts every prop HomeDashboard.jsx passes:
 *   - layers, nearby            : map layer / nearby toggles
 *   - activeLines               : currently-active line filters
 *   - highlightLines            : lines to highlight on the map
 *   - route                     : planned journey to render
 *   - liveLocation              : { lat, lng, heading } from parent
 *   - onGetDirections(station)  : parent callback for "directions to"
 * --------------------------------------------------------- */
export default function MapPanel({
  selectedLine = "all",
  className = "",
  layers,
  nearby,
  activeLines,
  highlightLines,
  route,
  liveLocation,
  onGetDirections,
}) {
  const mapRef = useRef(null);

  // Internal fallback for when the user clicks the location button
  // BEFORE the parent has started tracking (no journey planned, no
  // "current location" in the search form yet).
  const [internalLocation, setInternalLocation] = useState(null);

  // Source of truth: parent prop wins, internal state is the fallback.
  const userLocation =
    liveLocation &&
    Number.isFinite(liveLocation.lat) &&
    Number.isFinite(liveLocation.lng)
      ? [liveLocation.lat, liveLocation.lng]
      : internalLocation;

  const [liveTrains, setLiveTrains] = useState([]);
  const [trainCount, setTrainCount] = useState(0);

  const [open, setOpen] = useState(true);
  const [line, setLine] = useState("central");

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [sending, setSending] = useState(false);
  const [imageError, setImageError] = useState("");

  const fileInputRef = useRef(null);

  /* -----------------------------------------------------------
   * LOCATION BUTTON HANDLER
   * --------------------------------------------------------- */
  const handleLocate = () => {
    console.log("LOCATION BUTTON CLICKED");

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("LOCATION FOUND:", position.coords);
        const location = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setInternalLocation(location);
        if (mapRef.current) {
          mapRef.current.flyTo(location, 16, { animate: true, duration: 1 });
        }
      },
      (error) => {
        console.error("LOCATION ERROR:", error);
        if (error.code === 1) {
          alert(
            "Location permission denied. Click the lock icon next to localhost:5173 and allow location, then refresh."
          );
        } else if (error.code === 2) {
          alert("Your location could not be determined.");
        } else if (error.code === 3) {
          alert("Location request timed out. Try again.");
        } else {
          alert("Could not get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /* -----------------------------------------------------------
   * LOAD LIVE TRAINS
   * --------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadTrains() {
      try {
        const response = await fetch(
          "http://localhost:8000/api/train-positions"
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;

        const trains = Array.isArray(data)
          ? data
          : Array.isArray(data?.trains)
            ? data.trains
            : [];

        setLiveTrains(trains);
        setTrainCount(trains.length);
      } catch (error) {
        console.error("Train position error:", error);
      }
    }

    loadTrains();
    const interval = setInterval(loadTrains, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  /* -----------------------------------------------------------
   * LOAD CHAT
   * --------------------------------------------------------- */
  async function loadMessages() {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("line", line)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Chat load error:", error);
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error("Chat load exception:", error);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadMessages();
  }, [open, line]);

  /* -----------------------------------------------------------
   * IMAGE SELECTION
   * --------------------------------------------------------- */
  function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError("");

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setImageError("Please select an image or video.");
      return;
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError(
        isVideo ? "Video must be smaller than 50MB." : "Image must be smaller than 10MB."
      );
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearSelectedImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* -----------------------------------------------------------
   * SEND MESSAGE
   * --------------------------------------------------------- */
  async function sendMessage() {
    if (sending) return;
    if (!text.trim() && !selectedImage) return;

    setSending(true);
    setImageError("");

    try {
      let imageUrl = null;
      let videoUrl = null;

      if (selectedImage) {
        const safeName = selectedImage.name
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9._-]/g, "");
        const fileName = `${Date.now()}_${safeName}`;
        const bucket = selectedImage.type.startsWith("video/")
          ? "chat-videos"
          : "chat-images";

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, selectedImage, {
            contentType: selectedImage.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        if (selectedImage.type.startsWith("video/")) {
          videoUrl = publicUrlData?.publicUrl || null;
        } else {
          imageUrl = publicUrlData?.publicUrl || null;
        }
      }

      const payload = {
        username: "TrainLive User",
        message: text.trim(),
        line,
        image_url: imageUrl,
        video_url: videoUrl,
      };

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      if (data) setMessages((prev) => [...prev, data]);

      setText("");
      clearSelectedImage();
    } catch (error) {
      console.error("Chat upload/send error:", error);
      setImageError(error?.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  const filteredTrains =
    selectedLine === "all"
      ? liveTrains
      : liveTrains.filter((train) => {
          const trainLine = train.line || train.route || train.line_id || "";
          return (
            String(trainLine).toLowerCase() ===
            String(selectedLine).toLowerCase()
          );
        });

  /* -----------------------------------------------------------
   * SHARED BUTTON STYLE
   * --------------------------------------------------------- */
  const mapBtnStyle = {
    width: "40px",
    height: "40px",
    background: "white",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    color: "#2563eb",
    pointerEvents: "auto",
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-slate-100 ${className}`}
    >
      <MapContainer
        center={CENTER}
        zoom={13}
        zoomControl={false}
        className="w-full h-full"
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      >
        <MapBridge mapRef={mapRef} />

        <TileLayer
          url={`https://api.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey=${import.meta.env.VITE_THUNDERFOREST_API_KEY}`}
          attribution="&copy; Thunderforest &copy; OpenStreetMap contributors"
          maxZoom={22}
        />

        {/* USER LOCATION MARKER - driven by either parent's
            liveLocation or our internal button-triggered state */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon} zIndexOffset={10000} />
            <CircleMarker
              center={userLocation}
              radius={35}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#2563eb",
                fillOpacity: 0.12,
                weight: 2,
              }}
            />
          </>
        )}

        {/* LIVE TRAINS */}
        {filteredTrains.map((train, index) => {
          const lat = Number(train.latitude ?? train.lat ?? train.location?.latitude);
          const lng = Number(train.longitude ?? train.lng ?? train.lon ?? train.location?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return (
            <Marker
              key={train.id ?? train.train_id ?? train.vehicle_id ?? index}
              position={[lat, lng]}
              icon={trainIcon}
            />
          );
        })}
      </MapContainer>

      {/* ---------------------------------------------------------
          OVERLAY LAYER FOR BUTTONS. The wrapper has pointer-events:
          none so the map underneath stays draggable, and individual
          buttons re-enable pointer-events: auto. This guarantees
          nothing can accidentally cover them. --------------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1000,
          pointerEvents: "none",
        }}
      >
        {/* LOCATION BUTTON (top-right) */}
        <button
          type="button"
          onClick={handleLocate}
          title="Show my live location"
          aria-label="Show my live location"
          style={{
            ...mapBtnStyle,
            position: "absolute",
            top: "10px",
            right: "10px",
            pointerEvents: "auto",
          }}
        >
          <MapPin size={20} />
        </button>

        {/* ZOOM IN / OUT (right side, stacked vertically) */}
        <div
          style={{
            position: "absolute",
            right: "10px",
            bottom: "160px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            style={mapBtnStyle}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus size={20} />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            style={mapBtnStyle}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus size={20} />
          </button>
        </div>
      </div>

      {/* TRAIN COUNT (top-left) */}
      <div
        style={{
          position: "absolute",
          left: "12px",
          top: "12px",
          zIndex: 1100,
          background: "white",
          borderRadius: "8px",
          padding: "7px 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,.25)",
          fontSize: "13px",
          fontWeight: 600,
          color: "#334155",
          pointerEvents: "auto",
        }}
      >
        Live trains: {trainCount}
      </div>

      {/* CHAT PANEL */}
      {open && (
        <div
          className="absolute right-4 bottom-4 w-[360px] max-w-[calc(100%-32px)] bg-white rounded-xl shadow-2xl overflow-hidden"
          style={{ zIndex: 

