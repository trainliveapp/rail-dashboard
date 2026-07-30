import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StationReportModal from "./StationReportModal";
import { supabase } from "../supabase";
import liveIcon from "./live-icon.png";

delete L.Icon.Default.prototype._getIconUrl;

const center = [51.5074, -0.1278];

const lineTextColors = {
  bakerloo: "#B36305", central: "#DC241F", circle: "#C4A000", district: "#00782A",
  "hammersmith-city": "#D1668A", jubilee: "#A0A5A9", metropolitan: "#9B0056",
  northern: "#1A1A1A", piccadilly: "#003688", victoria: "#0098D4", "waterloo-city": "#5E9E8C"
};

const lines = [
  { id: "all", name: "All", color: "#ffffff" },
  { id: "central", name: "Central", color: "#DC241F" },
  { id: "northern", name: "Northern", color: "#1A1A1A" },
  { id: "victoria", name: "Victoria", color: "#0098D4" },
  { id: "piccadilly", name: "Piccadilly", color: "#003688" },
  { id: "jubilee", name: "Jubilee", color: "#A0A5A9" },
  { id: "district", name: "District", color: "#00782A" },
  { id: "circle", name: "Circle", color: "#C4A000" },
  { id: "bakerloo", name: "Bakerloo", color: "#B36305" },
  { id: "metropolitan", name: "Met", color: "#9B0056" },
  { id: "hammersmith-city", name: "H&C", color: "#D1668A" },
  { id: "waterloo-city", name: "W&C", color: "#5E9E8C" }
];

const lineRoutes = {
  central: [[51.5154, -0.1419], [51.5142, -0.1494], [51.5162, -0.1308], [51.5173, -0.1195], [51.5187, -0.1099], [51.5138, -0.0984], [51.5177, -0.0830], [51.5133, -0.0888]],
  victoria: [[51.5322, -0.1218], [51.5286, -0.1332], [51.5253, -0.1386], [51.5154, -0.1419], [51.5067, -0.1428], [51.4967, -0.1448]],
  northern: [[51.5322, -0.1218], [51.5286, -0.1332], [51.5253, -0.1386], [51.5162, -0.1308], [51.5113, -0.1283], [51.5083, -0.1248], [51.5073, -0.1228], [51.5033, -0.1136], [51.4871, -0.1117], [51.4803, -0.1155], [51.4732, -0.1215], [51.4666, -0.1262], [51.4624, -0.1428], [51.4546, -0.1482], [51.4432, -0.1556], [51.4018, -0.1955]],
  piccadilly: [[51.5322, -0.1218], [51.5173, -0.1195], [51.5128, -0.1243], [51.5113, -0.1283], [51.5098, -0.1342], [51.5067, -0.1428], [51.5026, -0.1526], [51.5015, -0.1604], [51.4941, -0.1739], [51.4914, -0.1973]],
  jubilee: [[51.5286, -0.1332], [51.5014, -0.1248], [51.5067, -0.1024], [51.5019, -0.0677]],
  district: [[51.5154, -0.1755], [51.5215, -0.1686], [51.5236, -0.1466], [51.5270, -0.1376], [51.5253, -0.1386], [51.5162, -0.1308], [51.5067, -0.1428], [51.4929, -0.1566], [51.4941, -0.1739], [51.4946, -0.1836], [51.4914, -0.1973], [51.4802, -0.1953], [51.4746, -0.1993], [51.4687, -0.2115], [51.4216, -0.2067]],
  circle: [[51.5154, -0.1755], [51.5215, -0.1686], [51.5270, -0.1376], [51.5236, -0.1466], [51.5162, -0.1308], [51.5067, -0.1428], [51.4929, -0.1566], [51.4941, -0.1739], [51.4946, -0.1836]],
  bakerloo: [[51.5226, -0.1570], [51.5215, -0.1686], [51.5154, -0.1755], [51.5138, -0.1587], [51.5154, -0.1419], [51.5083, -0.1248], [51.5073, -0.1228], [51.4947, -0.1051]],
  metropolitan: [[51.5224, -0.1636], [51.5236, -0.1466], [51.5270, -0.1376]],
  "hammersmith-city": [[51.5154, -0.1755], [51.5215, -0.1686], [51.5270, -0.1376], [51.5286, -0.1332], [51.5322, -0.1218], [51.5177, -0.0830]],
  "waterloo-city": [[51.5033, -0.1136], [51.5011, -0.0928]]
};

const stations = [
  { name: "Oxford Circus", lat: 51.5154, lng: -0.1419, line: "central" }, { name: "Paddington", lat: 51.5154, lng: -0.1755, line: "circle" },
  { name: "Kings Cross St Pancras", lat: 51.5322, lng: -0.1218, line: "victoria" }, { name: "Euston", lat: 51.5286, lng: -0.1332, line: "northern" },
  { name: "Victoria", lat: 51.4967, lng: -0.1448, line: "victoria" }, { name: "Liverpool Street", lat: 51.5177, lng: -0.0830, line: "central" },
  { name: "Waterloo", lat: 51.5033, lng: -0.1136, line: "northern" }, { name: "Bank", lat: 51.5133, lng: -0.0888, line: "northern" },
  { name: "Westminster", lat: 51.5014, lng: -0.1248, line: "jubilee" }, { name: "Green Park", lat: 51.5067, lng: -0.1428, line: "piccadilly" },
  { name: "Bond Street", lat: 51.5142, lng: -0.1494, line: "central" }, { name: "Baker Street", lat: 51.5226, lng: -0.1570, line: "bakerloo" },
  { name: "Marylebone", lat: 51.5224, lng: -0.1636, line: "metropolitan" }, { name: "Edgware Road", lat: 51.5215, lng: -0.1686, line: "circle" },
  { name: "Great Portland St", lat: 51.5236, lng: -0.1466, line: "metropolitan" }, { name: "Warren Street", lat: 51.5253, lng: -0.1386, line: "northern" },
  { name: "Goodge Street", lat: 51.5201, lng: -0.1338, line: "northern" }, { name: "Tottenham Court Rd", lat: 51.5162, lng: -0.1308, line: "central" },
  { name: "Leicester Square", lat: 51.5113, lng: -0.1283, line: "northern" }, { name: "Covent Garden", lat: 51.5128, lng: -0.1243, line: "piccadilly" },
  { name: "Holborn", lat: 51.5173, lng: -0.1195, line: "central" }, { name: "Chancery Lane", lat: 51.5187, lng: -0.1099, line: "central" },
  { name: "St Pauls", lat: 51.5138, lng: -0.0984, line: "central" }, { name: "Moorgate", lat: 51.5182, lng: -0.0886, line: "northern" },
  { name: "Old Street", lat: 51.5256, lng: -0.0883, line: "northern" }, { name: "Angel", lat: 51.5322, lng: -0.1059, line: "northern" },
  { name: "Euston Square", lat: 51.5270, lng: -0.1376, line: "circle" }, { name: "Notting Hill Gate", lat: 51.5099, lng: -0.1941, line: "circle" },
  { name: "Holland Park", lat: 51.5081, lng: -0.1983, line: "central" }, { name: "Shepherds Bush", lat: 51.5061, lng: -0.2218, line: "central" },
  { name: "White City", lat: 51.5099, lng: -0.2235, line: "central" }, { name: "Lancaster Gate", lat: 51.5124, lng: -0.1761, line: "central" },
  { name: "Marble Arch", lat: 51.5138, lng: -0.1587, line: "central" }, { name: "Hyde Park Corner", lat: 51.5026, lng: -0.1526, line: "piccadilly" },
  { name: "Knightsbridge", lat: 51.5015, lng: -0.1604, line: "piccadilly" }, { name: "Sloane Square", lat: 51.4929, lng: -0.1566, line: "circle" },
  { name: "South Kensington", lat: 51.4941, lng: -0.1739, line: "circle" }, { name: "Gloucester Road", lat: 51.4946, lng: -0.1836, line: "circle" },
  { name: "Earls Court", lat: 51.4914, lng: -0.1973, line: "district" }, { name: "Fulham Broadway", lat: 51.4802, lng: -0.1953, line: "district" },
  { name: "Parsons Green", lat: 51.4746, lng: -0.1993, line: "district" }, { name: "Putney Bridge", lat: 51.4687, lng: -0.2115, line: "district" },
  { name: "Wimbledon", lat: 51.4216, lng: -0.2067, line: "district" }, { name: "Morden", lat: 51.4018, lng: -0.1955, line: "northern" },
  { name: "Balham", lat: 51.4432, lng: -0.1556, line: "northern" }, { name: "Clapham South", lat: 51.4546, lng: -0.1482, line: "northern" },
  { name: "Clapham Common", lat: 51.4624, lng: -0.1428, line: "northern" }, { name: "Clapham North", lat: 51.4666, lng: -0.1262, line: "northern" },
  { name: "Stockwell", lat: 51.4732, lng: -0.1215, line: "northern" }, { name: "Oval", lat: 51.4803, lng: -0.1155, line: "northern" },
  { name: "Kennington", lat: 51.4871, lng: -0.1117, line: "northern" }, { name: "Elephant and Castle", lat: 51.4947, lng: -0.1051, line: "bakerloo" },
  { name: "Borough", lat: 51.5011, lng: -0.0928, line: "northern" }, { name: "London Bridge", lat: 51.5046, lng: -0.0865, line: "northern" },
  { name: "Bermondsey", lat: 51.5019, lng: -0.0677, line: "jubilee" }, { name: "Southwark", lat: 51.5067, lng: -0.1024, line: "jubilee" },
  { name: "Embankment", lat: 51.5073, lng: -0.1228, line: "bakerloo" }, { name: "Charing Cross", lat: 51.5083, lng: -0.1248, line: "bakerloo" },
  { name: "Piccadilly Circus", lat: 51.5098, lng: -0.1342, line: "piccadilly" }
];

const getStationIcon = (name, count) => L.divIcon({
  html: `<div style="transform:translate(-50%,-100%);background:${count > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)'};border:1px solid ${count > 0 ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.2)'};color:${count > 0 ? '#ff6666' : 'rgba(255,255,255,0.9)'};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;font-family:system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.9);box-shadow:0 0 15px ${count > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(0,0,0,0.2)'};white-space:nowrap;cursor:pointer;display:inline-block;backdrop-filter:blur(4px);">${name} ${count > 0 ? `<span style="background:#EF4444;color:white;padding:1px 6px;border-radius:10px;margin-left:6px;font-size:10px;">${count}</span>` : ''}</div>`,
  className: '', iconSize: [200, 50], iconAnchor: [100, 50]
});

const getTrainIcon = (color) => L.divIcon({
  html: `<style>@keyframes t-pulse{0%{transform:scale(.8);opacity:1}100%{transform:scale(2);opacity:0}}.t-ring{position:absolute;width:100%;height:100%;border-radius:50%;background:${color};animation:t-pulse 2s infinite;}</style><div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;"><div class="t-ring"></div><div style="width:12px;height:12px;background:white;border-radius:50%;z-index:2;position:relative;box-shadow:0 0 8px ${color};"></div></div>`,
  className: '', iconSize: [24, 24], iconAnchor: [12, 12]
});

function getTrainPosition(route, progress) {
  if (!route || route.length < 2) return center;
  const totalPoints = route.length - 1;
  const segmentProgress = progress * totalPoints;
  const index = Math.min(Math.floor(segmentProgress), totalPoints - 1);
  const segProgress = segmentProgress - index;
  const lat = route[index][0] + (route[index + 1][0] - route[index][0]) * segProgress;
  const lng = route[index][1] + (route[index + 1][1] - route[index][1]) * segProgress;
  return [lat, lng];
}

export default function MapPanel() {
  const [tubeRoutes, setTubeRoutes] = useState({});
  const [activeMapLine, setActiveMapLine] = useState("all");
  const [serverStations, setServerStations] = useState([]);
  const [serverTrains, setServerTrains] = useState([]);
  const [reportModal, setReportModal] = useState({ open: false, station: "" });
  const [reports, setReports] = useState([]);
  const [trains, setTrains] = useState([]);


  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchReports = async () => { const { data } = await supabase.from("station_reports").select("*").order("created_at", { ascending: false }); if (data) setReports(data); };
    fetchReports();
    const channel = supabase.channel("map-reports-realtime").on("postgres_changes", { event: "INSERT", schema: "public", table: "station_reports" }, (payload) => { setReports(prev => [payload.new, ...prev]); }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!open || !line) return;
    const fetchMessages = async () => { const { data } = await supabase.from("chat_messages").select("*").eq("line", line).order("created_at", { ascending: true }); if (data) setMessages(data); };
    fetchMessages();
    const channel = supabase.channel(`chat-${line}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `line=eq.${line}` }, (payload) => { setMessages((prev) => [...prev, payload.new]); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [line, open]);

  useEffect(() => {
    const linesToSimulate = activeMapLine === 'all' ? Object.keys(lineRoutes) : [activeMapLine];
    const initialTrains = [];
    linesToSimulate.forEach(lId => {
      if(lineRoutes[lId]) {
        const count = activeMapLine === 'all' ? 1 : 2;
        for(let i=0; i<count; i++) {
          initialTrains.push({ id: `${lId}-${i}`, line: lId, progress: i * (1/count), speed: 0.002 });
        }
      }
    });
    setTrains(initialTrains);

    const interval = setInterval(() => {
      setTrains(prev => prev.map(t => {
        let newProgress = t.progress + t.speed;
        if (newProgress > 1) newProgress = 0; 
        return { ...t, progress: newProgress };
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [activeMapLine]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleImageSelect(e) { const file = e.target.files[0]; if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); } }

  async function sendMessage() {
    let imageUrl = null;
    if (selectedImage) {
      const fileName = `${Date.now()}_${selectedImage.name}`;
      const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, selectedImage);
      if (!uploadError) { const { data: pubData } = supabase.storage.from('chat-images').getPublicUrl(fileName); imageUrl = pubData.publicUrl; }
    }
    if (!text.trim() && !imageUrl) return;
    const { error } = await supabase.from("chat_messages").insert({ username: "TrainLive User", message: text.trim(), line: line, image_url: imageUrl });
    if (!error) { setText(""); setSelectedImage(null); setImagePreview(""); if(fileInputRef.current) fileInputRef.current.value = ""; }
  }

  const displayedStations =
 activeMapLine === "all"
 ? serverStations
 : serverStations.filter(
    s => s.line === activeMapLine
 ); 


  return (
    <div className="relative w-full h-full flex flex-col">
      
      {/* --- FLOATING TOP SELECTOR --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] flex gap-2 bg-black/80 backdrop-blur-xl p-2 rounded-full border border-white/10 shadow-2xl">
        {lines.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveMapLine(l.id)}
            title={l.name}
            className="group relative w-8 h-8 rounded-full border-2 transition-all duration-300 hover:scale-110"
            style={{ 
              borderColor: activeMapLine === l.id ? 'white' : 'transparent',
              backgroundColor: l.color,
              outline: l.color === '#1A1A1A' ? '1px solid rgba(255,255,255,0.3)' : 'none'
            }}
          >
            {l.id === 'all' && <div className="absolute inset-0 m-auto w-3 h-3 bg-white rounded-full" />}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/20">
              {l.name}
            </span>
          </button>
        ))}
      </div>

      {/* --- MAP --- */}
      <div className="flex-1 w-full" key={activeMapLine} style={{ animation: 'fadeIn 0.4s ease-in-out' }}>
        <MapContainer
  center={center}
  zoom={12}
  style={{ height: '100%', width: '100%' }}
  zoomControl={false}
  attributionControl={false}
>
  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />


  {/* --- TUBE LINES --- */}
  {Object.entries(tubeRoutes).map(([lineId, route]) => {

    if (!route || route.length < 2) return null;

    if (
      activeMapLine !== "all" &&
      activeMapLine !== lineId
    ) {
      return null;
    }

    return (
      <Polyline
        key={lineId}
        positions={route}
        pathOptions={{
          color: lineTextColors[lineId] || "#ffffff",
          weight: 5,
          opacity: 0.9
        }}
      />
    );

  })}

 {/* --- STATIONS --- */}
{/* --- STATIONS --- */}
{Array.isArray(displayedStations) && displayedStations.map((station) => (
  <Marker
    key={station.id || station.name}
   position={[
 station.latitude ?? station.lat,
 station.longitude ?? station.lng
]}
    icon={getStationIcon(
      station.name,
      reports.filter(
        (r) => r.station_name === station.name
      ).length
    )}
    eventHandlers={{
      click: () =>
        setReportModal({
          open: true,
          station: station.name,
        }),
    }}
  />
))}
{/* --- TRAINS --- */}
{trains.map((train) => (
  <Marker
    key={train.id}
    position={getTrainPosition(
      tubeRoutes[train.line] || lineRoutes[train.line],
      train.progress
    )}
    icon={getTrainIcon(lineTextColors[train.line])}
  />
))}
</MapContainer>
</div>

<StationReportModal
  stationName={reportModal.station}
  isOpen={reportModal.open}
  onClose={() =>
    setReportModal({
      open: false,
      station: "",
    })
  }
/>

<button
  onClick={() => setOpen(!open)}
  className="absolute bottom-5 right-5 z-[999999] bg-white hover:bg-gray-100 p-2.5 rounded-full shadow-xl border border-gray-200"
>
  <img
    src={liveIcon}
    alt="Live Chat"
    className="w-9 h-9 object-contain"
  />
</button>

{open && (
  <div className="absolute bottom-20 right-5 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[999999] flex flex-col overflow-hidden">

    {/* Keep your existing chat window contents here exactly as they are */}

  </div>
)}

<style>{`
@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: scale(.95);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}
`}</style>

</div>
);

}