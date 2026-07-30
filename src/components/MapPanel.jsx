import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow
} from "@react-google-maps/api";
import StationReportModal from "./StationReportModal";
import { supabase } from "../supabase";

const center = { lat: 51.5074, lng: -0.1278 };
const containerStyle = { width: "100%", height: "100%" };

const blueTrainSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#2563EB"/><path d="M16 6C12 6 10 8 10 12V18C10 20 11 21 13 21L12 23H14L15 21H17L18 23H20L19 21C21 21 22 20 22 18V12C22 8 20 6 16 6ZM13 18C12.4 18 12 17.6 12 17C12 16.4 12.4 16 13 16C13.6 16 14 16.4 14 17C14 17.6 13.6 18 13 18ZM14 13H12V10H14V13ZM20 18C19.4 18 19 17.6 19 17C19 16.4 19.4 16 20 16C20.6 16 21 16.4 21 17C21 17.6 20.6 18 20 18ZM20 13H18V10H20V13Z" fill="white"/></svg>`;
const redTrainSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8));"><circle cx="16" cy="16" r="16" fill="#EF4444"/><path d="M16 6C12 6 10 8 10 12V18C10 20 11 21 13 21L12 23H14L15 21H17L18 23H20L19 21C21 21 22 20 22 18V12C22 8 20 6 16 6ZM13 18C12.4 18 12 17.6 12 17C12 16.4 12.4 16 13 16C13.6 16 14 16.4 14 17C14 17.6 13.6 18 13 18ZM14 13H12V10H14V13ZM20 18C19.4 18 19 17.6 19 17C19 16.4 19.4 16 20 16C20.6 16 21 16.4 21 17C21 17.6 20.6 18 20 18ZM20 13H18V10H20V13Z" fill="white"/></svg>`;

const blueIcon = { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(blueTrainSvg)}` };
const redIcon = { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(redTrainSvg)}` };

const stations = [
  { name: "Oxford Circus", lat: 51.5154, lng: -0.1419 },
  { name: "Paddington", lat: 51.5154, lng: -0.1755 },
  { name: "Kings Cross St Pancras", lat: 51.5322, lng: -0.1218 },
  { name: "Euston", lat: 51.5286, lng: -0.1332 },
  { name: "Victoria", lat: 51.4967, lng: -0.1448 },
  { name: "Liverpool Street", lat: 51.5177, lng: -0.0830 },
  { name: "Waterloo", lat: 51.5033, lng: -0.1136 },
  { name: "Bank", lat: 51.5133, lng: -0.0888 },
  { name: "Westminster", lat: 51.5014, lng: -0.1248 },
  { name: "Green Park", lat: 51.5067, lng: -0.1428 },
  { name: "Bond Street", lat: 51.5142, lng: -0.1494 },
  { name: "Baker Street", lat: 51.5226, lng: -0.1570 },
  { name: "Marylebone", lat: 51.5224, lng: -0.1636 },
  { name: "Edgware Road", lat: 51.5215, lng: -0.1686 },
  { name: "Great Portland St", lat: 51.5236, lng: -0.1466 },
  { name: "Warren Street", lat: 51.5253, lng: -0.1386 },
  { name: "Goodge Street", lat: 51.5201, lng: -0.1338 },
  { name: "Tottenham Court Rd", lat: 51.5162, lng: -0.1308 },
  { name: "Leicester Square", lat: 51.5113, lng: -0.1283 },
  { name: "Covent Garden", lat: 51.5128, lng: -0.1243 },
  { name: "Holborn", lat: 51.5173, lng: -0.1195 },
  { name: "Chancery Lane", lat: 51.5187, lng: -0.1099 },
  { name: "St Pauls", lat: 51.5138, lng: -0.0984 },
  { name: "Moorgate", lat: 51.5182, lng: -0.0886 },
  { name: "Old Street", lat: 51.5256, lng: -0.0883 },
  { name: "Angel", lat: 51.5322, lng: -0.1059 },
  { name: "Euston Square", lat: 51.5270, lng: -0.1376 },
  { name: "Notting Hill Gate", lat: 51.5099, lng: -0.1941 },
  { name: "Holland Park", lat: 51.5081, lng: -0.1983 },
  { name: "Shepherds Bush", lat: 51.5061, lng: -0.2218 },
  { name: "White City", lat: 51.5099, lng: -0.2235 },
  { name: "Lancaster Gate", lat: 51.5124, lng: -0.1761 },
  { name: "Marble Arch", lat: 51.5138, lng: -0.1587 },
  { name: "Hyde Park Corner", lat: 51.5026, lng: -0.1526 },
  { name: "Knightsbridge", lat: 51.5015, lng: -0.1604 },
  { name: "Sloane Square", lat: 51.4929, lng: -0.1566 },
  { name: "South Kensington", lat: 51.4941, lng: -0.1739 },
  { name: "Gloucester Road", lat: 51.4946, lng: -0.1836 },
  { name: "Earls Court", lat: 51.4914, lng: -0.1973 },
  { name: "Fulham Broadway", lat: 51.4802, lng: -0.1953 },
  { name: "Parsons Green", lat: 51.4746, lng: -0.1993 },
  { name: "Putney Bridge", lat: 51.4687, lng: -0.2115 },
  { name: "Wimbledon", lat: 51.4216, lng: -0.2067 },
  { name: "Morden", lat: 51.4018, lng: -0.1955 },
  { name: "Balham", lat: 51.4432, lng: -0.1556 },
  { name: "Clapham South", lat: 51.4546, lng: -0.1482 },
  { name: "Clapham Common", lat: 51.4624, lng: -0.1428 },
  { name: "Clapham North", lat: 51.4666, lng: -0.1262 },
  { name: "Stockwell", lat: 51.4732, lng: -0.1215 },
  { name: "Oval", lat: 51.4803, lng: -0.1155 },
  { name: "Kennington", lat: 51.4871, lng: -0.1117 },
  { name: "Elephant and Castle", lat: 51.4947, lng: -0.1051 },
  { name: "Borough", lat: 51.5011, lng: -0.0928 },
  { name: "London Bridge", lat: 51.5046, lng: -0.0865 },
  { name: "Bermondsey", lat: 51.5019, lng: -0.0677 },
  { name: "Southwark", lat: 51.5067, lng: -0.1024 },
  { name: "Embankment", lat: 51.5073, lng: -0.1228 },
  { name: "Charing Cross", lat: 51.5083, lng: -0.1248 },
  { name: "Piccadilly Circus", lat: 51.5098, lng: -0.1342 }
];

export default function MapPanel() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY
  });

  const [reportModal, setReportModal] = useState({ open: false, station: "" });
  const [infoWindow, setInfoWindow] = useState({ open: false, station: "", position: null });
  const [reports, setReports] = useState([]);

  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  // --- REALTIME REPORTS ---
  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase.from("station_reports").select("*").order("created_at", { ascending: false });
      if (data) setReports(data);
    };
    fetchReports();

    const channel = supabase
      .channel("map-reports-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "station_reports" }, (payload) => {
        setReports(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // --- REALTIME CHAT ---
  useEffect(() => {
    if (!open || !line) return;
    
    const fetchMessages = async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("line", line).order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat-${line}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `line=eq.${line}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [line, open]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  async function sendMessage() {
    if (!text.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({ username: "TrainLive User", message: text.trim(), line: line });
    if (!error) setText("");
  }

  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center text-white">Loading Map...</div>;

  const activeStationReports = reports.filter(r => r.station_name === infoWindow.station);

  return (
    <div className="relative w-full h-full">
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={center} 
        zoom={12} 
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {stations.map((station) => (
          <Marker 
            key={station.name} 
            position={{ lat: station.lat, lng: station.lng }} 
            icon={reports.some(r => r.station_name === station.name) ? redIcon : blueIcon} 
            onClick={() => setInfoWindow({ open: true, station: station.name, position: { lat: station.lat, lng: station.lng } })} 
          />
        ))}

        {infoWindow.open && (
          <InfoWindow 
            position={infoWindow.position} 
            onCloseClick={() => setInfoWindow({ open: false, station: "", position: null })}
            options={{ maxWidth: 250 }}
          >
            <div className="w-52 p-1">
              <h4 className="font-bold text-gray-800 text-sm mb-2 border-b pb-1">{infoWindow.station}</h4>
              
              {activeStationReports.length > 0 ? (
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  <p className="text-red-600 text-xs font-bold">⚠️ Active Reports:</p>
                  {activeStationReports.map((r) => (
                    <div key={r.id} className="bg-red-50 border border-red-200 rounded p-1.5 text-xs text-gray-700">
                      <span className="font-bold capitalize text-red-500">• {r.report_type}</span>
                      {r.message && <p className="mt-0.5 text-gray-600">{r.message}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-green-600 text-xs mb-3 font-medium">✅ No active reports</p>
              )}

              <button 
                onClick={() => setReportModal({ open: true, station: infoWindow.station })} 
                className="w-full text-xs text-white font-semibold bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-center"
              >
                + Add Report
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <StationReportModal 
        stationName={reportModal.station} 
        isOpen={reportModal.open} 
        onClose={() => setReportModal({ open: false, station: "" })} 
      />

      <button 
        onClick={() => setOpen(!open)} 
        className="absolute bottom-5 right-5 z-[999999] bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-colors"
      >
        <MessageCircle size={24} />
      </button>

      {open && (
        <div className="absolute bottom-20 right-5 w-80 h-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[999999] flex flex-col">
          <div className="p-3 bg-gray-800 rounded-t-lg border-b border-gray-700">
            <p className="text-white font-bold text-sm">🚇 {line.charAt(0).toUpperCase() + line.slice(1)} Live</p>
            <select 
              value={line} 
              onChange={(e) => setLine(e.target.value)} 
              className="w-full mt-2 bg-gray-700 text-white border-0 rounded p-2 text-xs outline-none"
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
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-xs text-blue-400 font-bold">{m.username}</span>
                <p className="text-sm text-white">{m.message}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="flex p-2 border-t border-gray-700 bg-gray-800 rounded-b-lg">
            <input 
              value={text} 
              onChange={e => setText(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
              className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-lg text-sm outline-none" 
              placeholder="Message..." 
            />
            <button 
              onClick={sendMessage} 
              className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}