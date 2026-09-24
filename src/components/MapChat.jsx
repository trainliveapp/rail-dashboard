import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Paperclip, Camera, Loader2, Share2 } from "lucide-react";
import { siFacebook, siInstagram, siTiktok, siX } from "simple-icons";
import { supabase } from "../supabase";
import { lineTextColors } from "./lineColors";

const CHAT_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;

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
const CHAT_LINE_COLORS = {
  ...lineTextColors,
  "great western railway": "#4b1f4f",
};
const CHAT_EMOJIS = ["\u2764\ufe0f", "\ud83d\ude02", "\ud83d\ude21", "\ud83d\ude2e", "\ud83d\udc4d", "\ud83d\ude80"];
const LINKEDIN_ICON = {
  hex: "0A66C2",
  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V8.97h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.316zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM3.555 20.452h3.564V8.97H3.555v11.482zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
};
const SOCIAL_SHARE_OPTIONS = [
  ["X", siX, "https://twitter.com/intent/tweet?text=Join%20TrainLive%20live%20chat&url="],
  ["Instagram", siInstagram, "https://www.instagram.com/?url="],
  ["TikTok", siTiktok, "https://www.tiktok.com/upload?lang=en"],
  ["Facebook", siFacebook, "https://www.facebook.com/sharer/sharer.php?u="],
  ["LinkedIn", LINKEDIN_ICON, "https://www.linkedin.com/sharing/share-offsite/?url="],
];

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
  const [flyingEmojis, setFlyingEmojis] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

  const useEmoji = (emoji) => {
    setText((current) => `${current}${emoji}`);
    const id = `${Date.now()}-${Math.random()}`;
    setFlyingEmojis((current) => [...current, { id, emoji, left: 12 + Math.random() * 72 }]);
    window.setTimeout(() => {
      setFlyingEmojis((current) => current.filter((item) => item.id !== id));
    }, 1800);
  };

  async function loadMessages() {

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("line", line)
      .gte("created_at", new Date(Date.now() - CHAT_VISIBILITY_WINDOW_MS).toISOString())
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
        ...(videoUrl ? { video_url: videoUrl } : {}),
      };

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setMessages((prev) => [...prev, data]);
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
          aria-label="Open chatter"
          className="group flex h-20 w-20 items-center justify-center rounded-full p-1 transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden">
            <span className="chatter-icon" aria-hidden="true"><span className="chatter-icon__core">chatter</span></span>
          </span>
        </button>
      )}

      {open && (
        <div className="relative fixed bottom-5 right-5 z-[2000] flex h-[min(520px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between bg-white px-4 py-4 text-slate-900 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden">
                <span className="chatter-icon" aria-hidden="true"><span className="chatter-icon__core">chatter</span></span>
              </span>
              <div>
                <h3 className="text-sm font-bold">chatter</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chatter"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium capitalize text-white outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              style={{ backgroundColor: CHAT_LINE_COLORS[line] || "#334155" }}
            >
              {TUBE_LINES.map((item) => (
                <option
                  key={item}
                  value={item}
                  style={{ backgroundColor: CHAT_LINE_COLORS[item] || "#334155", color: "#fff" }}
                >
                  {item} line
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800">
                  <MessageCircle size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-800">Start the conversation</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Share a delay, ask a question, or help another passenger.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id || index} className="mb-3 max-w-[88%] rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2.5 last:mb-0">
                  <p className="mb-1 text-[11px] font-bold text-brand-ink">{message.username}</p>
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

          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 h-64 overflow-hidden" aria-hidden="true">
            {flyingEmojis.map((item) => (
              <span
                key={item.id}
                className="chat-flying-emoji absolute bottom-0 text-3xl"
                style={{ left: `${item.left}%` }}
              >
                {item.emoji}
              </span>
            ))}
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
              <button type="button" onClick={clearSelectedImage} className="text-slate-400 hover:text-brand-live" aria-label="Remove attachment">
                <X size={16} />
              </button>
            </div>
          )}

          {imageError && (
            <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{imageError}</div>
          )}

          <div className="border-t border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5 py-1" aria-label="Add an emoji to your message">
              {CHAT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => useEmoji(emoji)}
                  aria-label={`Use ${emoji} emoji`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg transition-transform hover:bg-amber-50 hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleImageSelection}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
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
                aria-label="Take a photo or video"
                title="Take a photo or video"
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Camera size={16} />
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-amber text-brand-ink transition-colors hover:bg-yellow-300 disabled:bg-slate-300 disabled:text-slate-500"
                disabled={sending || (!text.trim() && !selectedImage)}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            {shareOpen && (
              <div className="mt-2 flex items-center justify-center gap-2" role="menu" aria-label="Share on social media">
                {SOCIAL_SHARE_OPTIONS.map(([label, icon, base]) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    aria-label={`Share on ${label}`}
                    title={`Share on ${label}`}
                    onClick={() => window.open(`${base}${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ backgroundColor: `#${icon.hex}` }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-current">
                      <path d={icon.path} />
                    </svg>
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