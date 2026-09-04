import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Paperclip, Loader2, Share2 } from "lucide-react";
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
  "great western railway",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
export default function MapChat() {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [selectedIsVideo, setSelectedIsVideo] = useState(false);
  const [sending, setSending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setImageError("Please select a JPG, PNG, WEBP or video file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageError("File must be under 50MB.");
      event.target.value = "";
      return;
    }

    setImageError("");
    setSelectedImage(file);
    setSelectedIsVideo(isVideo);
    setImagePreview(isVideo ? "" : URL.createObjectURL(file));
    event.target.value = "";
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    setImageError("");
    setSelectedIsVideo(false);
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
}, [open, line]);


   async function sendMessage() {
    if (sending) return;
    if (!text.trim() && !selectedImage) return;

    setSending(true);
    setImageError("");

    try {
      let imageUrl = null;
      let videoUrl = null;

    if (selectedImage) {
        const fileName = `${Date.now()}_${selectedImage.name.replace(/\s+/g, "-")}`;

        const bucket = selectedImage.type.startsWith("video/")
          ? "chat-videos"
          : "chat-images";

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, selectedImage, {
            contentType: selectedImage.type,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

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

      const { error } = await supabase
        .from("chat_messages")
        .insert(payload);

      if (error) {
        throw error;
      }

      setText("");
      clearSelectedImage();

    } catch (error) {
      console.error("Chat upload/send error:", error);
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
                  {message.video_url && (
                    <video
                      src={message.video_url}
                      controls
                      className="mt-2 max-h-52 w-full rounded-lg"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {selectedImage && (
            <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2">
              {selectedIsVideo ? (
                <video
                  src={URL.createObjectURL(selectedImage)}
                  className="h-12 w-16 rounded-lg object-cover"
                  muted
                />
              ) : (
                <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1 text-xs text-slate-500 truncate">{selectedImage.name}</div>
              <button type="button" onClick={clearSelectedImage} className="text-slate-400 hover:text-red-500" aria-label="Remove attachment">
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
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleImageSelection}
              />
              <button
                type="button"
                aria-label="Attach image or video"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                aria-label="Share TrainLive"
                aria-expanded={shareOpen}
                onClick={() => setShareOpen((open) => !open)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Share2 size={16} />
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
            {shareOpen && (
              <div className="mt-2 grid grid-cols-5 gap-1.5" role="menu" aria-label="Share on social media">
                {[
                  ['X', 'https://twitter.com/intent/tweet?text=Join%20TrainLive%20live%20chat&url='],
                  ['Instagram', 'https://www.instagram.com/?url='],
                  ['TikTok', 'https://www.tiktok.com/upload?lang=en'],
                  ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u='],
                  ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url='],
                ].map(([label, base]) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    aria-label={`Share on ${label}`}
                    title={`Share on ${label}`}
                    onClick={() => window.open(`${base}${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer')}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-[10px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                  >
                    <span className="text-[10px] font-bold">{label === 'Instagram' ? 'IG' : label === 'Facebook' ? 'f' : label === 'LinkedIn' ? 'in' : label === 'TikTok' ? 'TT' : 'X'}</span>
                    <span className="sr-only sm:not-sr-only">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>

  )

}