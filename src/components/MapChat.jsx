import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Paperclip, Loader2 } from "lucide-react";
import { supabase } from "../supabase";
import liveIcon from "./live-icon.png";

const TUBE_LINES = [
  "central",
  "jubilee",
  "northern",
  "piccadilly",
  "victoria",
  "district",
  "circle",
  "metropolitan",
  "bakerloo",
  "elizabeth",
  "south western railway",
  "great western railway",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export default function MapChat() {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Image must be JPG, PNG or WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be under 5MB.");
      event.target.value = "";
      return;
    }

    setImageError("");
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function loadMessages() {

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("line", line)
      .order("created_at", { ascending: true });


    if (error) {
      console.error(error);
      return;
    }


    setMessages(data || []);

  }



  useEffect(() => {

    if (!open) return;


    loadMessages();


    const channel = supabase
      .channel("chat-" + line)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `line=eq.${line}`
        },
        (payload) => {

          setMessages(prev => [
            ...prev,
            payload.new
          ]);

        }
      )
      .subscribe();



    return () => {

      supabase.removeChannel(channel);

    };


  }, [open, line]);


  async function sendMessage() {
    if (sending) return;
    if (!text.trim() && !selectedImage) return;

    setSending(true);
    setImageError("");

    try {
      let imageUrl = null;

      if (selectedImage) {
        const fileName = `${Date.now()}_${selectedImage.name.replace(/\s+/g, "-")}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(fileName, selectedImage, { contentType: selectedImage.type, upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage.from("chat-images").getPublicUrl(fileName);
        imageUrl = publicUrlData?.publicUrl || null;
      }

      const payload = {
        username: "TrainLive User",
        message: text.trim(),
        line,
        image_url: imageUrl,
      };

      const { error } = await supabase.from("chat_messages").insert(payload);
      if (error) throw error;

      setText("");
      clearSelectedImage();
    } catch (error) {
      console.error(error);
      setImageError(error?.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open live chat"
          className="group flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-md shadow-slate-200/80 transition-transform hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-slate-200 overflow-hidden">
            <img src={liveIcon} alt="Live chat" className="h-6 w-6 object-contain" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <span>Live chat</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[2000] flex h-[min(520px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between bg-white px-4 py-4 text-slate-900 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                <img src={liveIcon} alt="Live chat" className="h-6 w-6 object-contain" />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
              </span>
              <div>
                <h3 className="text-sm font-bold">Live chat</h3>
                <p className="mt-0.5 text-xs capitalize text-slate-500">{line} line community</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close live chat"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={19} />
            </button>
          </div>

          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <label htmlFor="chat-line" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Chat channel
            </label>
            <select
              id="chat-line"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium capitalize text-slate-800 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {TUBE_LINES.map((item) => (
                <option key={item} value={item}>{item} line</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <MessageCircle size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-800">Start the conversation</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Share a delay, ask a question, or help another passenger.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id || index} className="mb-3 max-w-[88%] rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2.5 last:mb-0">
                  <p className="mb-1 text-[11px] font-bold text-blue-700">{message.username}</p>
                  {message.message && (
                    <p className="break-words text-sm leading-relaxed text-slate-700">{message.message}</p>
                  )}
                  {message.image_url && (
                    <img
                      src={message.image_url}
                      alt="Shared in chat"
                      className="mt-2 max-h-40 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {imagePreview && (
            <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2">
              <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1 text-xs text-slate-500 truncate">{selectedImage?.name}</div>
              <button type="button" onClick={clearSelectedImage} className="text-slate-400 hover:text-red-500" aria-label="Remove image">
                <X size={16} />
              </button>
            </div>
          )}

          {imageError && (
            <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{imageError}</div>
          )}

          <div className="border-t border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageSelection}
              />
              <button
                type="button"
                aria-label="Attach image"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Paperclip size={16} />
              </button>
              <input
                aria-label="Chat message"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Write a message..."
              />
              <button
                type="button"
                onClick={sendMessage}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
                disabled={sending || (!text.trim() && !selectedImage)}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>

  )

}