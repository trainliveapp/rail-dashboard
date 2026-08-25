import { useState, useEffect, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../supabase";

const center = [51.5074, -0.1278];

const lines = [
  { id: "central", name: "Central" },
  { id: "northern", name: "Northern" },
  { id: "victoria", name: "Victoria" },
  { id: "piccadilly", name: "Piccadilly" },
  { id: "jubilee", name: "Jubilee" },
  { id: "district", name: "District" },
  { id: "circle", name: "Circle" },
  { id: "bakerloo", name: "Bakerloo" }
];

const lineColors = {
  central: "#DC241F", northern: "#1A1A1A", victoria: "#0098D4",
  piccadilly: "#003688", jubilee: "#A0A5A9", district: "#00782A",
  circle: "#C4A000", bakerloo: "#B36305"
};

const trackedLines = ["victoria", "jubilee", "central", "northern", "piccadilly"];

const getTrainIcon = (lineId) => {
  const color = lineColors[lineId] || "#ffffff";
  return L.divIcon({
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div class="train-ping" style="background: ${color};"></div>
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8 2 5 4.5 5 8V15L3 17V18H21V17L19 15V8C19 4.5 16 2 12 2ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"/>
          </svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function MapPanel() {
  const [open, setOpen] = useState(true);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  
  const [reports, setReports] = useState([]);
  const [reportModal, setReportModal] = useState({ open: false, station: "" });
  const [reportText, setReportText] = useState("");

  const [liveTrains, setLiveTrains] = useState([]);
  const [trainCount, setTrainCount] = useState(0);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // --- REPORTS SYNC ---
  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase.from("station_reports").select("*").order("created_at", { ascending: false });
      if (data) setReports(data);
    };
    fetchReports();

    const channel = supabase.channel("public-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "station_reports" }, (payload) => {
        setReports((prev) => [payload.new, ...prev]);
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // --- CHAT SYNC ---
  useEffect(() => {
    if (!line) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase.from("chat_messages").select("*").eq("line", line).order("created_at", { ascending: true });
      if (!error && data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase.channel(`chat-${line}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `line=eq.${line}` }, (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [line]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); }
  }

  const sendMessage = async () => {
    let imageUrl = null;
    if (selectedImage) {
      const fileName = `${Date.now()}_${selectedImage.name}`;
      const { error: uploadError } = await supabase.storage.from("chat-images").upload(fileName, selectedImage);
      if (!uploadError) {
        const { data: pubData } = supabase.storage.from("chat-images").getPublicUrl(fileName);
        imageUrl = pubData.publicUrl;
      }
    }
    if (!inputValue.trim() && !imageUrl) return;
    await supabase.from("chat_messages").insert({ username: "TrainLive User", message: inputValue.trim(), line: line, image_url: imageUrl });
    setInputValue(""); setSelectedImage(null); setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitReport = async () => {
    if (!reportText.trim()) return;
    await supabase.from("station_reports").insert({ station_name: reportModal.station, message: reportText, username: "TrainLive User" });
    setReportText("");
    setReportModal({ open: false, station: "" });
  };

  const lineTitle = line.charAt(0).toUpperCase() + line.slice(1);
  const activeColor = lineColors[line] || "#333333";

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">
      
      <style>{`
        .train-ping {
          position: absolute; inset: 0; border-radius: 50%; opacity: 0.5;
          animation: trainPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes trainPing {
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      {/* --- MAP --- */}
      <div className="flex-1 w-full">
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=621eabec59ac465f80e08407cea35377" subdomains="abc" />

          {liveTrains.map((train) => (
            <Marker
              key={train.vehicleId || Math.random()}
              position={[train.latitude, train.longitude]}
              icon={getTrainIcon(train.lineId)}
            />
          ))}
        </MapContainer>
      </div>

      {/* --- MOVED: LIVE TRAIN COUNTER (Top Left) --- */}
      <div className="absolute top-4 left-4 z-[999998] bg-black/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-white/10">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        <span className="text-sm font-bold">{trainCount} Trains Live</span>
      </div>

      {/* --- MOVED: CHAT TOGGLE (Top Right) --- */}
      {!open && (
        <button onClick={() => setOpen(true)} className="absolute top-4 right-4 z-[999999] text-white px-4 py-2.5 rounded-full shadow-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 text-sm" style={{ backgroundColor: activeColor }}>
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          {lineTitle} Live
        </button>
      )}

      {/* --- REPORT MODAL --- */}
      {reportModal.open && (
        <div className="absolute inset-0 z-[999998] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Report: {reportModal.station}</h3>
              <button onClick={() => setReportModal({ open: false, station: "" })} className="text-gray-400 hover:text-black"><X size={20} /></button>
            </div>
            <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="What's happening at this station?" className="w-full h-24 p-3 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
            <button onClick={submitReport} className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded font-semibold hover:bg-blue-700">Submit Report</button>
          </div>
        </div>
      )}

      {/* --- FLOATING CHAT WINDOW (Lifted up to avoid search bar) --- */}
      {open && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 w-[90%] sm:w-[340px] h-[50vh] sm:h-[450px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-[999999] flex flex-col overflow-hidden">
          <div className="text-white px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between shrink-0" style={{ backgroundColor: activeColor }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
              <h3 className="font-bold text-sm tracking-wide">{lineTitle} Live</h3>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select value={line} onChange={(e) => setLine(e.target.value)} className="bg-black/30 text-white text-[10px] rounded px-2 py-1 border border-white/30 outline-none cursor-pointer backdrop-blur-sm">
                {lines.map((l) => (<option key={l.id} value={l.id} className="text-black bg-white">{l.name}</option>))}
              </select>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors p-1"><X size={18} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {Array.isArray(messages) && messages.length === 0 && (<p className="text-center text-gray-400 text-xs mt-10">No messages yet on the {lineTitle} line.</p>)}
                      {Array.isArray(messages) && messages.map((msg, i) => (
              <div 
                key={msg.id || i} 
                className={`max-w-[85%] p-2.5 rounded-2xl text-sm bg-white text-gray-800 border border-gray-200 ${
                  msg.username === "TrainLive User" 
                    ? "ml-auto rounded-br-sm" 
                    : "mr-auto rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.username !== "TrainLive User" && (
                  <p className="text-[10px] font-bold mb-1 text-gray-600">{msg.username}</p>
                )}
                {msg.message && <p>{msg.message}</p>}
                {msg.image_url && (<img src={msg.image_url} alt="shared" className="mt-1 rounded-lg max-w-full max-h-40 object-cover cursor-pointer" onClick={() => window.open(msg.image_url, "_blank")} />)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {imagePreview && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
              <img src={imagePreview} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
              <div className="flex-1 text-xs text-gray-500 truncate">{selectedImage?.name}</div>
              <button onClick={() => { setSelectedImage(null); setImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
            </div>
          )}

          <div className="flex items-center gap-2 p-2 sm:p-3 border-t border-gray-200 bg-white shrink-0">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"><ImagePlus size={22} /></button>
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={`${lineTitle} Live`} className="flex-1 bg-gray-100 text-gray-800 px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base" />
            <button onClick={sendMessage} className="text-white px-4 sm:px-5 py-2.5 rounded-full hover:opacity-90 transition-colors text-sm font-semibold shadow-sm shrink-0" style={{ backgroundColor: activeColor }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}