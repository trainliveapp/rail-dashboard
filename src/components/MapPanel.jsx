import { useEffect, useRef, useState, useCallback } from "react";
import { ImagePlus, X } from "lucide-react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import StationReportModal from "./StationReportModal";
import { supabase } from "../supabase";
import liveIcon from "./live-icon.png";

const center = { lat: 51.5074, lng: -0.1278 };
const containerStyle = { width: "100%", height: "100%" };

// --- HEADER TEXT COLORS (Tweaked light colors for readability on white) ---
const lineTextColors = {
  bakerloo: "#B36305",       // Brown
  central: "#DC241F",        // Red
  circle: "#C4A000",         // Darker Yellow
  district: "#00782A",       // Green
  "hammersmith-city": "#D1668A", // Darker Pink
  jubilee: "#A0A5A9",        // Grey
  metropolitan: "#9B0056",   // Magenta
  northern: "#1A1A1A",       // Black
  piccadilly: "#003688",     // Dark Blue
  victoria: "#0098D4",       // Light Blue
  "waterloo-city": "#5E9E8C" // Darker Teal
};

const stations = [
  { name: "Oxford Circus", lat: 51.5154, lng: -0.1419 }, { name: "Paddington", lat: 51.5154, lng: -0.1755 },
  { name: "Kings Cross St Pancras", lat: 51.5322, lng: -0.1218 }, { name: "Euston", lat: 51.5286, lng: -0.1332 },
  { name: "Victoria", lat: 51.4967, lng: -0.1448 }, { name: "Liverpool Street", lat: 51.5177, lng: -0.0830 },
  { name: "Waterloo", lat: 51.5033, lng: -0.1136 }, { name: "Bank", lat: 51.5133, lng: -0.0888 },
  { name: "Westminster", lat: 51.5014, lng: -0.1248 }, { name: "Green Park", lat: 51.5067, lng: -0.1428 },
  { name: "Bond Street", lat: 51.5142, lng: -0.1494 }, { name: "Baker Street", lat: 51.5226, lng: -0.1570 },
  { name: "Marylebone", lat: 51.5224, lng: -0.1636 }, { name: "Edgware Road", lat: 51.5215, lng: -0.1686 },
  { name: "Great Portland St", lat: 51.5236, lng: -0.1466 }, { name: "Warren Street", lat: 51.5253, lng: -0.1386 },
  { name: "Goodge Street", lat: 51.5201, lng: -0.1338 }, { name: "Tottenham Court Rd", lat: 51.5162, lng: -0.1308 },
  { name: "Leicester Square", lat: 51.5113, lng: -0.1283 }, { name: "Covent Garden", lat: 51.5128, lng: -0.1243 },
  { name: "Holborn", lat: 51.5173, lng: -0.1195 }, { name: "Chancery Lane", lat: 51.5187, lng: -0.1099 },
  { name: "St Pauls", lat: 51.5138, lng: -0.0984 }, { name: "Moorgate", lat: 51.5182, lng: -0.0886 },
  { name: "Old Street", lat: 51.5256, lng: -0.0883 }, { name: "Angel", lat: 51.5322, lng: -0.1059 },
  { name: "Euston Square", lat: 51.5270, lng: -0.1376 }, { name: "Notting Hill Gate", lat: 51.5099, lng: -0.1941 },
  { name: "Holland Park", lat: 51.5081, lng: -0.1983 }, { name: "Shepherds Bush", lat: 51.5061, lng: -0.2218 },
  { name: "White City", lat: 51.5099, lng: -0.2235 }, { name: "Lancaster Gate", lat: 51.5124, lng: -0.1761 },
  { name: "Marble Arch", lat: 51.5138, lng: -0.1587 }, { name: "Hyde Park Corner", lat: 51.5026, lng: -0.1526 },
  { name: "Knightsbridge", lat: 51.5015, lng: -0.1604 }, { name: "Sloane Square", lat: 51.4929, lng: -0.1566 },
  { name: "South Kensington", lat: 51.4941, lng: -0.1739 }, { name: "Gloucester Road", lat: 51.4946, lng: -0.1836 },
  { name: "Earls Court", lat: 51.4914, lng: -0.1973 }, { name: "Fulham Broadway", lat: 51.4802, lng: -0.1953 },
  { name: "Parsons Green", lat: 51.4746, lng: -0.1993 }, { name: "Putney Bridge", lat: 51.4687, lng: -0.2115 },
  { name: "Wimbledon", lat: 51.4216, lng: -0.2067 }, { name: "Morden", lat: 51.4018, lng: -0.1955 },
  { name: "Balham", lat: 51.4432, lng: -0.1556 }, { name: "Clapham South", lat: 51.4546, lng: -0.1482 },
  { name: "Clapham Common", lat: 51.4624, lng: -0.1428 }, { name: "Clapham North", lat: 51.4666, lng: -0.1262 },
  { name: "Stockwell", lat: 51.4732, lng: -0.1215 }, { name: "Oval", lat: 51.4803, lng: -0.1155 },
  { name: "Kennington", lat: 51.4871, lng: -0.1117 }, { name: "Elephant and Castle", lat: 51.4947, lng: -0.1051 },
  { name: "Borough", lat: 51.5011, lng: -0.0928 }, { name: "London Bridge", lat: 51.5046, lng: -0.0865 },
  { name: "Bermondsey", lat: 51.5019, lng: -0.0677 }, { name: "Southwark", lat: 51.5067, lng: -0.1024 },
  { name: "Embankment", lat: 51.5073, lng: -0.1228 }, { name: "Charing Cross", lat: 51.5083, lng: -0.1248 },
  { name: "Piccadilly Circus", lat: 51.5098, lng: -0.1342 }
];

export default function MapPanel() {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY });

  const [reportModal, setReportModal] = useState({ open: false, station: "" });
  const [nearestStation, setNearestStation] = useState(null);
  const [reports, setReports] = useState([]);

  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const findNearestStation = useCallback((lat, lng) => {
    let minDist = Infinity; let closest = null;
    stations.forEach(s => {
      const dist = Math.sqrt(Math.pow(s.lat - lat, 2) + Math.pow(s.lng - lng, 2));
      if (dist < minDist) { minDist = dist; closest = s.name; }
    });
    setNearestStation(closest);
  }, []);

  const onCenterChanged = useCallback((map) => {
    if (!map) return;
    const c = map.getCenter();
    findNearestStation(c.lat(), c.lng());
  }, [findNearestStation]);

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); }
  }

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

  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center text-white">Loading Map...</div>;
  const activeReportCount = reports.filter(r => r.station_name === nearestStation).length;

  return (
    <div className="relative w-full h-full">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13} onCenterChanged={onCenterChanged}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }, { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] }] }}
      />

      {nearestStation && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[999999] w-auto">
          <div className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${activeReportCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
              <span className="text-white font-medium text-sm whitespace-nowrap">Nearest: <span className="font-bold">{nearestStation}</span></span>
              {activeReportCount > 0 && (<span className="text-red-400 text-xs font-bold bg-red-500/20 px-2 py-0.5 rounded-full">{activeReportCount} issues</span>)}
            </div>
            <button onClick={() => setReportModal({ open: true, station: nearestStation })} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${activeReportCount > 0 ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`}>Report</button>
          </div>
        </div>
      )}

      <StationReportModal stationName={reportModal.station} isOpen={reportModal.open} onClose={() => setReportModal({ open: false, station: "" })} />

      {/* CUSTOM LIVE ICON BUTTON */}
      <button onClick={() => setOpen(!open)} className="absolute bottom-5 right-5 z-[999999] bg-white hover:bg-gray-100 p-2.5 rounded-full shadow-xl transition-colors border border-gray-200">
        <img src={liveIcon} alt="Live Chat" className="w-9 h-9 object-contain" />
      </button>

      {/* --- WHITE THEME CHAT WINDOW --- */}
      {open && (
        <div className="absolute bottom-20 right-5 w-80 h-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[999999] flex flex-col overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <p className="font-bold text-sm" style={{ color: lineTextColors[line] || '#000' }}>
              {line.charAt(0).toUpperCase() + line.slice(1)} Live
            </p>
            <select 
              value={line} 
              onChange={(e) => setLine(e.target.value)} 
              className="w-full mt-2 bg-white text-gray-700 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="bakerloo">Bakerloo Live</option>
              <option value="central">Central Live</option>
              <option value="circle">Circle Live</option>
              <option value="district">District Live</option>
              <option value="hammersmith-city">Hammersmith & City Live</option>
              <option value="jubilee">Jubilee Live</option>
              <option value="metropolitan">Metropolitan Live</option>
              <option value="northern">Northern Live</option>
              <option value="piccadilly">Piccadilly Live</option>
              <option value="victoria">Victoria Live</option>
              <option value="waterloo-city">Waterloo & City Live</option>
            </select>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.map((m) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-2">
                <span className="text-blue-600 font-bold text-xs">{m.username}</span>
                {m.message && <p className="text-gray-900 text-sm mt-1">{m.message}</p>}
                {m.image_url && <img src={m.image_url} className="mt-2 max-w-full rounded-lg max-h-48 object-cover cursor-pointer" onClick={() => window.open(m.image_url, "_blank")} alt="chat" />}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="flex flex-col bg-white rounded-b-2xl">
            {imagePreview && (
              <div className="px-3 pt-3 flex items-center gap-2">
                <div className="relative">
                  <img src={imagePreview} className="w-12 h-12 object-cover rounded-lg border border-gray-200" alt="preview" />
                  <button onClick={() => { setSelectedImage(null); setImagePreview(""); }} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5 hover:bg-red-600">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            <div className="flex p-3 border-t border-gray-100">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
              <button onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-blue-600 px-2 transition-colors">
                <ImagePlus size={20} />
              </button>
              <input 
                value={text} 
                onChange={e => setText(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
                className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 px-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" 
                placeholder="Message..." 
              />
              <button onClick={sendMessage} className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}