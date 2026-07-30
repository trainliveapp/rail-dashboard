import { useState, useEffect, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { MapContainer, TileLayer } from "react-leaflet";
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

// Exact line colors
const lineColors = {
  central: "#DC241F",
  northern: "#1A1A1A",
  victoria: "#0098D4",
  piccadilly: "#003688",
  jubilee: "#A0A5A9",
  district: "#00782A",
  circle: "#C4A000",
  bakerloo: "#B36305"
};

export default function MapPanel() {
  const [open, setOpen] = useState(true);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  
  // Image states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch chat messages
  useEffect(() => {
    if (!line) return;
    
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("line", line)
        .order("created_at", { ascending: true });
      if (!error && data) setMessages(data);
    };
    
    fetchMessages();

    const channel = supabase
      .channel(`chat-${line}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `line=eq.${line}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [line]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  const sendMessage = async () => {
    let imageUrl = null;
    
    // Upload image if selected
    if (selectedImage) {
      const fileName = `${Date.now()}_${selectedImage.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, selectedImage);
      if (!uploadError) {
        const { data: pubData } = supabase.storage
          .from("chat-images")
          .getPublicUrl(fileName);
        imageUrl = pubData.publicUrl;
      }
    }

    if (!inputValue.trim() && !imageUrl) return;

    await supabase.from("chat_messages").insert({
      username: "TrainLive User",
      message: inputValue.trim(),
      line: line,
      image_url: imageUrl,
    });

    // Reset inputs
    setInputValue("");
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const lineTitle = line.charAt(0).toUpperCase() + line.slice(1);
  const activeColor = lineColors[line] || "#333333";

  return (
    <div className="relative w-full h-full">
      
      {/* --- CLEAN MAP --- */}
      <div className="absolute inset-0">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url={`https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${import.meta.env.VITE_THUNDERFOREST_KEY}`}
            subdomains="abc"
          />
        </MapContainer>
      </div>

      {/* --- TOGGLE BUTTON (When closed) --- */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-6 right-6 z-[999999] text-white px-5 py-3 rounded-full shadow-xl font-bold hover:opacity-90 transition-all flex items-center gap-2"
          style={{ backgroundColor: activeColor }}
        >
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          {lineTitle} Live
        </button>
      )}

      {/* --- FLOATING CHAT WINDOW --- */}
      {open && (
        <div className="absolute bottom-6 right-6 w-[340px] h-[450px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-[999999] flex flex-col overflow-hidden">
          
          {/* HEADER: Dynamic Line Color + Close Button */}
          <div 
            className="text-white px-4 py-3 flex items-center justify-between shrink-0"
            style={{ backgroundColor: activeColor }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
              <h3 className="font-bold text-sm tracking-wide">
                {lineTitle} Live
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="bg-black/30 text-white text-[10px] rounded px-2 py-1 border border-white/30 outline-none cursor-pointer backdrop-blur-sm"
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id} className="text-black bg-white">
                    {l.name}
                  </option>
                ))}
              </select>
              
              {/* CLOSE BUTTON */}
              <button 
                onClick={() => setOpen(false)} 
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MESSAGES AREA */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {Array.isArray(messages) && messages.length === 0 && (
              <p className="text-center text-gray-400 text-xs mt-10">
                No messages yet on the {lineTitle} line.
              </p>
            )}
            {Array.isArray(messages) &&
              messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`max-w-[85%] p-2.5 rounded-2xl text-sm ${
                    msg.username === "TrainLive User"
                      ? "ml-auto text-white rounded-br-sm"
                      : "mr-auto bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                  }`}
                  style={msg.username === "TrainLive User" ? { backgroundColor: activeColor } : {}}
                >
                  {msg.username !== "TrainLive User" && (
                    <p className="text-[10px] font-bold mb-1" style={{ color: activeColor }}>
                      {msg.username}
                    </p>
                  )}
                  {msg.message && <p>{msg.message}</p>}
                  {msg.image_url && (
                    <img 
                      src={msg.image_url} 
                      alt="shared" 
                      className="mt-1 rounded-lg max-w-full max-h-40 object-cover cursor-pointer"
                      onClick={() => window.open(msg.image_url, "_blank")}
                    />
                  )}
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          {/* IMAGE PREVIEW BAR */}
          {imagePreview && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
              <img src={imagePreview} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
              <div className="flex-1 text-xs text-gray-500 truncate">
                {selectedImage?.name}
              </div>
              <button 
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }} 
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* INPUT AREA WITH IMAGE BUTTON */}
          <div className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white shrink-0">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ImagePlus size={22} />
            </button>
            
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`${lineTitle} Live`}
              className="flex-1 bg-gray-100 text-gray-800 px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={sendMessage}
              className="text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-colors text-sm font-semibold shadow-sm"
              style={{ backgroundColor: activeColor }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}