// import { useEffect, useRef, useState } from "react";
// import { MessageCircle, X, Send, Paperclip, Camera, Loader2, Share2 } from "lucide-react";
// import { siFacebook, siInstagram, siTiktok, siX } from "simple-icons";
// import { supabase } from "../supabase";
// import { lineTextColors } from "./lineColors";

// const CHAT_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;

// const TUBE_LINES = [
//   "central",
//   "jubilee",
//   "northern",
//   "piccadilly",
//   "victoria",
//   "district",
//   "circle",
//   "metropolitan",
//   "bakerloo",
//   "elizabeth",
//   "great western railway",
// ];

// const MAX_FILE_SIZE = 50 * 1024 * 1024;
// const CHAT_LINE_COLORS = {
//   ...lineTextColors,
//   "great western railway": "#4b1f4f",
// };
// const CHAT_EMOJIS = ["\u2764\ufe0f", "\ud83d\ude02", "\ud83d\ude21", "\ud83d\ude2e", "\ud83d\udc4d", "\ud83d\ude80"];
// const LINKEDIN_ICON = {
//   hex: "0A66C2",
//   path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V8.97h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.316zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM3.555 20.452h3.564V8.97H3.555v11.482zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
// };
// const SOCIAL_SHARE_OPTIONS = [
//   ["X", siX, "https://twitter.com/intent/tweet?text=Join%20TrainLive%20live%20chat&url="],
//   ["Instagram", siInstagram, "https://www.instagram.com/?url="],
//   ["TikTok", siTiktok, "https://www.tiktok.com/upload?lang=en"],
//   ["Facebook", siFacebook, "https://www.facebook.com/sharer/sharer.php?u="],
//   ["LinkedIn", LINKEDIN_ICON, "https://www.linkedin.com/sharing/share-offsite/?url="],
// ];

// export default function MapChat() {
//   const [open, setOpen] = useState(false);
//   const [line, setLine] = useState("central");
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");
//   const [selectedImage, setSelectedImage] = useState(null);
//   const [imagePreview, setImagePreview] = useState("");
//   const [imageError, setImageError] = useState("");
//   const [selectedIsVideo, setSelectedIsVideo] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [shareOpen, setShareOpen] = useState(false);
//   const [flyingEmojis, setFlyingEmojis] = useState([]);
//   const fileInputRef = useRef(null);
//   const cameraInputRef = useRef(null);

//   const handleImageSelection = (event) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
//     const isVideo = file.type.startsWith("video/");

//     if (!isImage && !isVideo) {
//       setImageError("Please select a JPG, PNG, WEBP or video file.");
//       event.target.value = "";
//       return;
//     }

//     if (file.size > MAX_FILE_SIZE) {
//       setImageError("File must be under 50MB.");
//       event.target.value = "";
//       return;
//     }

//     setImageError("");
//     setSelectedImage(file);
//     setSelectedIsVideo(isVideo);
//     setImagePreview(isVideo ? "" : URL.createObjectURL(file));
//     event.target.value = "";
//   };

//   const clearSelectedImage = () => {
//     setSelectedImage(null);
//     setImagePreview("");
//     setImageError("");
//     setSelectedIsVideo(false);
//     if (fileInputRef.current) {
//       fileInputRef.current.value = "";
//     }
//   };

//   const useEmoji = (emoji) => {
//     setText((current) => `${current}${emoji}`);
//     const id = `${Date.now()}-${Math.random()}`;
//     setFlyingEmojis((current) => [...current, { id, emoji, left: 12 + Math.random() * 72 }]);
//     window.setTimeout(() => {
//       setFlyingEmojis((current) => current.filter((item) => item.id !== id));
//     }, 1800);
//   };

//   async function loadMessages() {

//     const { data, error } = await supabase
//       .from("chat_messages")
//       .select("*")
//       .eq("line", line)
//       .gte("created_at", new Date(Date.now() - CHAT_VISIBILITY_WINDOW_MS).toISOString())
//       .order("created_at", { ascending: true });


//     if (error) {
//       console.error(error);
//       return;
//     }


//     setMessages(data || []);

//   }



// useEffect(() => {
//   if (!open) return;

//   loadMessages();
// }, [open, line]);


//    async function sendMessage() {
//     if (sending) return;
//     if (!text.trim() && !selectedImage) return;

//     setSending(true);
//     setImageError("");

//     try {
//       let imageUrl = null;
//       let videoUrl = null;

//     if (selectedImage) {
//         const fileName = `${Date.now()}_${selectedImage.name.replace(/\s+/g, "-")}`;

//         const bucket = selectedImage.type.startsWith("video/")
//           ? "chat-videos"
//           : "chat-images";

//         const { error: uploadError } = await supabase.storage
//           .from(bucket)
//           .upload(fileName, selectedImage, {
//             contentType: selectedImage.type,
//             upsert: false,
//           });

//         if (uploadError) {
//           throw uploadError;
//         }

//         const { data: publicUrlData } = supabase.storage
//           .from(bucket)
//           .getPublicUrl(fileName);

//         if (selectedImage.type.startsWith("video/")) {
//           videoUrl = publicUrlData?.publicUrl || null;
//         } else {
//           imageUrl = publicUrlData?.publicUrl || null;
//         }
//       }

//       const payload = {
//         username: "TrainLive User",
//         message: text.trim(),
//         line,
//         image_url: imageUrl,
//         ...(videoUrl ? { video_url: videoUrl } : {}),
//       };

//       const { data, error } = await supabase
//         .from("chat_messages")
//         .insert(payload)
//         .select()
//         .single();

//       if (error) {
//         throw error;
//       }

//       if (data) {
//         setMessages((prev) => [...prev, data]);
//       }

//       setText("");
//       clearSelectedImage();

//     } catch (error) {
//       console.error("Chat upload/send error:", error);
//       setImageError(error?.message || "Could not send your message.");

//     } finally {
//       setSending(false);
//     }
//   }

//   return (
//     <>
//       {!open && (
//         <button
//           type="button"
//           onClick={() => setOpen(true)}
//           aria-label="Open chatter"
//           className="group flex h-20 w-20 items-center justify-center rounded-full p-1 transition-transform hover:-translate-y-0.5 active:translate-y-0"
//         >
//           <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden">
//             <span className="chatter-icon" aria-hidden="true"><span className="chatter-icon__core">chatter</span></span>
//           </span>
//         </button>
//       )}

//       {open && (
//         <div className="relative fixed bottom-5 right-5 z-[2000] flex h-[min(520px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
//           <div className="flex items-center justify-between bg-white px-4 py-4 text-slate-900 border-b border-slate-200">
//             <div className="flex items-center gap-3">
//               <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden">
//                 <span className="chatter-icon" aria-hidden="true"><span className="chatter-icon__core">chatter</span></span>
//               </span>
//               <div>
//                 <h3 className="text-sm font-bold">chatter</h3>
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={() => setOpen(false)}
//               aria-label="Close chatter"
//               className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
//             >
//               <X size={19} />
//             </button>
//           </div>

//           <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
//             <label htmlFor="chat-line" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
//               Chat channel
//             </label>
//             <select
//               id="chat-line"
//               value={line}
//               onChange={(e) => setLine(e.target.value)}
//               className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium capitalize text-white outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
//               style={{ backgroundColor: CHAT_LINE_COLORS[line] || "#334155" }}
//             >
//               {TUBE_LINES.map((item) => (
//                 <option
//                   key={item}
//                   value={item}
//                   style={{ backgroundColor: CHAT_LINE_COLORS[item] || "#334155", color: "#fff" }}
//                 >
//                   {item} line
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
//             {messages.length === 0 ? (
//               <div className="flex h-full flex-col items-center justify-center px-6 text-center">
//                 <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800">
//                   <MessageCircle size={22} />
//                 </span>
//                 <p className="text-sm font-semibold text-slate-800">Start the conversation</p>
//                 <p className="mt-1 text-xs leading-relaxed text-slate-400">Share a delay, ask a question, or help another passenger.</p>
//               </div>
//             ) : (
//               messages.map((message, index) => (
//                 <div key={message.id || index} className="mb-3 max-w-[88%] rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2.5 last:mb-0">
//                   <p className="mb-1 text-[11px] font-bold text-brand-ink">{message.username}</p>
//                   {message.message && (
//                     <p className="break-words text-sm leading-relaxed text-slate-700">{message.message}</p>
//                   )}
//                   {message.image_url && (
//                     <img
//                       src={message.image_url}
//                       alt="Shared in chat"
//                       className="mt-2 max-h-40 w-full rounded-lg object-cover"
//                       loading="lazy"
//                     />
//                   )}
//                   {message.video_url && (
//                     <video
//                       src={message.video_url}
//                       controls
//                       className="mt-2 max-h-52 w-full rounded-lg"
//                     />
//                   )}
//                 </div>
//               ))
//             )}
//           </div>

//           <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 h-64 overflow-hidden" aria-hidden="true">
//             {flyingEmojis.map((item) => (
//               <span
//                 key={item.id}
//                 className="chat-flying-emoji absolute bottom-0 text-3xl"
//                 style={{ left: `${item.left}%` }}
//               >
//                 {item.emoji}
//               </span>
//             ))}
//           </div>

//           {selectedImage && (
//             <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2">
//               {selectedIsVideo ? (
//                 <video
//                   src={URL.createObjectURL(selectedImage)}
//                   className="h-12 w-16 rounded-lg object-cover"
//                   muted
//                 />
//               ) : (
//                 <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
//               )}
//               <div className="min-w-0 flex-1 text-xs text-slate-500 truncate">{selectedImage.name}</div>
//               <button type="button" onClick={clearSelectedImage} className="text-slate-400 hover:text-brand-live" aria-label="Remove attachment">
//                 <X size={16} />
//               </button>
//             </div>
//           )}

//           {imageError && (
//             <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{imageError}</div>
//           )}

//           <div className="border-t border-slate-100 bg-slate-50 p-3">
//             <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5 py-1" aria-label="Add an emoji to your message">
//               {CHAT_EMOJIS.map((emoji) => (
//                 <button
//                   key={emoji}
//                   type="button"
//                   onClick={() => useEmoji(emoji)}
//                   aria-label={`Use ${emoji} emoji`}
//                   className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg transition-transform hover:bg-amber-50 hover:scale-110"
//                 >
//                   {emoji}
//                 </button>
//               ))}
//             </div>
//             <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
//                 className="hidden"
//                 onChange={handleImageSelection}
//               />
//               <input
//                 ref={cameraInputRef}
//                 type="file"
//                 accept="image/*"
//                 capture="environment"
//                 className="hidden"
//                 onChange={handleImageSelection}
//               />
//               <button
//                 type="button"
//                 aria-label="Attach image or video"
//                 onClick={() => fileInputRef.current?.click()}
//                 className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <Paperclip size={16} />
//               </button>
//               <button
//                 type="button"
//                 aria-label="Take a photo or video"
//                 title="Take a photo or video"
//                 onClick={() => cameraInputRef.current?.click()}
//                 className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <Camera size={16} />
//               </button>
//               <button
//                 type="button"
//                 aria-label="Share TrainLive"
//                 aria-expanded={shareOpen}
//                 onClick={() => setShareOpen((open) => !open)}
//                 className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <Share2 size={16} />
//               </button>
//               <input
//                 aria-label="Chat message"
//                 className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
//                 value={text}
//                 onChange={(e) => setText(e.target.value)}
//                 onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
//                 placeholder="Write a message..."
//               />
//               <button
//                 type="button"
//                 onClick={sendMessage}
//                 aria-label="Send message"
//                 className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-amber text-brand-ink transition-colors hover:bg-yellow-300 disabled:bg-slate-300 disabled:text-slate-500"
//                 disabled={sending || (!text.trim() && !selectedImage)}
//               >
//                 {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
//               </button>
//             </div>
//             {shareOpen && (
//               <div className="mt-2 flex items-center justify-center gap-2" role="menu" aria-label="Share on social media">
//                 {SOCIAL_SHARE_OPTIONS.map(([label, icon, base]) => (
//                   <button
//                     key={label}
//                     type="button"
//                     role="menuitem"
//                     aria-label={`Share on ${label}`}
//                     title={`Share on ${label}`}
//                     onClick={() => window.open(`${base}${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer')}
//                     className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
//                     style={{ backgroundColor: `#${icon.hex}` }}
//                   >
//                     <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-current">
//                       <path d={icon.path} />
//                     </svg>
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </>

//   )

// }



// import { useEffect, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import {
//   MessageCircle,
//   X,
//   Send,
//   Paperclip,
//   Camera,
//   Loader2,
//   Share2,
//   Smile,
// } from "lucide-react";
// import { siFacebook, siInstagram, siTiktok, siX } from "simple-icons";
// import { supabase } from "../supabase";
// import { lineTextColors } from "./lineColors";

// const CHAT_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;
// const MAX_FILE_SIZE = 50 * 1024 * 1024;
// // Change this if your app uses a different authentication route.
// const DEFAULT_SIGN_IN_URL = "/login";

// const TUBE_LINES = [
//   "central",
//   "jubilee",
//   "northern",
//   "piccadilly",
//   "victoria",
//   "district",
//   "circle",
//   "metropolitan",
//   "bakerloo",
//   "elizabeth",
//   "great western railway",
// ];

// const CHAT_LINE_COLORS = {
//   ...lineTextColors,
//   "great western railway": "#4b1f4f",
// };

// const CHAT_EMOJIS = ["❤️", "😂", "😡", "😮", "👍", "🚀"];
// const REACTION_EMOJIS = ["❤️", "😂", "😡", "😮", "👍", "🚀"];

// const LINKEDIN_ICON = {
//   hex: "0A66C2",
//   path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V8.97h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.316zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM3.555 20.452h3.564V8.97H3.555v11.482zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
// };

// const SOCIAL_SHARE_OPTIONS = [
//   ["X", siX, "https://twitter.com/intent/tweet?text=Join%20TrainLive%20live%20chat&url="],
//   ["Instagram", siInstagram, "https://www.instagram.com/?url="],
//   ["TikTok", siTiktok, "https://www.tiktok.com/upload?lang=en"],
//   ["Facebook", siFacebook, "https://www.facebook.com/sharer/sharer.php?u="],
//   ["LinkedIn", LINKEDIN_ICON, "https://www.linkedin.com/sharing/share-offsite/?url="],
// ];

// function formatMessageTime(value) {
//   if (!value) return "";
//   try {
//     return new Intl.DateTimeFormat([], {
//       hour: "numeric",
//       minute: "2-digit",
//     }).format(new Date(value));
//   } catch {
//     return "";
//   }
// }

// function totalReactionCount(reactionState) {
//   return Object.values(reactionState?.counts || {}).reduce(
//     (total, value) => total + value,
//     0
//   );
// }

// export default function MapChat({ signInUrl = DEFAULT_SIGN_IN_URL }) {
//   const [open, setOpen] = useState(false);
//   const [line, setLine] = useState("central");
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");
//   const [selectedImage, setSelectedImage] = useState(null);
//   const [imagePreview, setImagePreview] = useState("");
//   const [imageError, setImageError] = useState("");
//   const [selectedIsVideo, setSelectedIsVideo] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [authLoading, setAuthLoading] = useState(true);
//   const [emojiOpen, setEmojiOpen] = useState(false);
//   const [shareOpen, setShareOpen] = useState(false);
//   const [flyingEmojis, setFlyingEmojis] = useState([]);
//   const [reactions, setReactions] = useState({});
//   const [activeReactionMessage, setActiveReactionMessage] = useState(null);
//   const [reactionPickerStyle, setReactionPickerStyle] = useState(null);

//   const fileInputRef = useRef(null);
//   const cameraInputRef = useRef(null);
//   const currentUserRef = useRef(null);
//   const messagesRef = useRef([]);
//   const reactionButtonRefs = useRef({});
//   const chatPanelRef = useRef(null);

//   async function getCurrentUser() {
//     const {
//       data: { user },
//       error,
//     } = await supabase.auth.getUser();

//     if (error) {
//       console.error("Could not get current user:", error);
//       return null;
//     }

//     currentUserRef.current = user || null;
//     setIsAuthenticated(Boolean(user));
//     setAuthLoading(false);
//     return user || null;
//   }

//   useEffect(() => {
//     let mounted = true;

//     supabase.auth.getSession().then(({ data, error }) => {
//       if (!mounted) return;
//       if (error) console.error("Could not read auth session:", error);
//       const user = data?.session?.user || null;
//       currentUserRef.current = user;
//       setIsAuthenticated(Boolean(user));
//       setAuthLoading(false);
//     });

//     const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
//       const user = session?.user || null;
//       currentUserRef.current = user;
//       setIsAuthenticated(Boolean(user));
//       setAuthLoading(false);
//     });

//     return () => {
//       mounted = false;
//       authSubscription?.subscription?.unsubscribe();
//     };
//   }, []);

//   const handleImageSelection = (event) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
//     const isVideo = file.type.startsWith("video/");

//     if (!isImage && !isVideo) {
//       setImageError("Please select a JPG, PNG, WEBP or video file.");
//       event.target.value = "";
//       return;
//     }

//     if (file.size > MAX_FILE_SIZE) {
//       setImageError("File must be under 50MB.");
//       event.target.value = "";
//       return;
//     }

//     setImageError("");
//     setSelectedImage(file);
//     setSelectedIsVideo(isVideo);

//     if (isVideo) setImagePreview("");
//     else setImagePreview(URL.createObjectURL(file));

//     event.target.value = "";
//   };

//   const clearSelectedImage = () => {
//     if (imagePreview) URL.revokeObjectURL(imagePreview);
//     setSelectedImage(null);
//     setImagePreview("");
//     setImageError("");
//     setSelectedIsVideo(false);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   useEffect(() => {
//     return () => {
//       if (imagePreview) URL.revokeObjectURL(imagePreview);
//     };
//   }, [imagePreview]);

//   const useEmoji = (emoji) => {
//     setText((current) => `${current}${emoji}`);
//     const id = `${Date.now()}-${Math.random()}`;
//     setFlyingEmojis((current) => [
//       ...current,
//       { id, emoji, left: 12 + Math.random() * 72 },
//     ]);
//     window.setTimeout(() => {
//       setFlyingEmojis((current) => current.filter((item) => item.id !== id));
//     }, 1800);
//   };

//   async function loadMessages() {
//     const { data, error } = await supabase
//       .from("chat_messages")
//       .select("*")
//       .eq("line", line)
//       .gte(
//         "created_at",
//         new Date(Date.now() - CHAT_VISIBILITY_WINDOW_MS).toISOString()
//       )
//       .order("created_at", { ascending: true });

//     if (error) {
//       console.error("Could not load chat messages:", error);
//       return [];
//     }

//     const nextMessages = data || [];
//     setMessages(nextMessages);
//     messagesRef.current = nextMessages;
//     await loadReactions(nextMessages.map((message) => message.id));
//     return nextMessages;
//   }

//   async function loadReactions(messageIds) {
//     if (!messageIds.length) {
//       setReactions({});
//       return;
//     }

//     const user = currentUserRef.current || (await getCurrentUser());

//     const { data, error } = await supabase
//       .from("chat_message_reactions")
//       .select("message_id, user_id, reaction")
//       .in("message_id", messageIds);

//     if (error) {
//       console.error("Could not load reactions:", error);
//       return;
//     }

//     const next = {};

//     for (const item of data || []) {
//       if (!next[item.message_id]) {
//         next[item.message_id] = { counts: {}, myReaction: null };
//       }

//       next[item.message_id].counts[item.reaction] =
//         (next[item.message_id].counts[item.reaction] || 0) + 1;

//       if (user && item.user_id === user.id) {
//         next[item.message_id].myReaction = item.reaction;
//       }
//     }

//     setReactions(next);
//   }

//   function positionReactionPicker(messageId) {
//     const button = reactionButtonRefs.current[messageId];
//     if (!button) return;

//     const rect = button.getBoundingClientRect();
//     const pickerWidth = 292;
//     const horizontalPadding = 10;
//     const left = Math.max(
//       horizontalPadding,
//       Math.min(
//         rect.right - pickerWidth,
//         window.innerWidth - pickerWidth - horizontalPadding
//       )
//     );

//     const spaceAbove = rect.top;
//     const pickerHeight = 52;
//     const top =
//       spaceAbove >= pickerHeight + 10
//         ? rect.top - pickerHeight - 10
//         : Math.min(window.innerHeight - pickerHeight - 10, rect.bottom + 10);

//     setReactionPickerStyle({
//       position: "fixed",
//       left,
//       top,
//       width: pickerWidth,
//     });
//   }

//   function openReactionPicker(messageId) {
//     const next = activeReactionMessage === messageId ? null : messageId;
//     setActiveReactionMessage(next);
//     if (next) requestAnimationFrame(() => positionReactionPicker(next));
//   }

//   useEffect(() => {
//     if (!activeReactionMessage) return undefined;

//     const update = () => positionReactionPicker(activeReactionMessage);
//     window.addEventListener("resize", update);
//     window.addEventListener("scroll", update, true);

//     const onPointerDown = (event) => {
//       const picker = document.getElementById("trainlive-reaction-picker");
//       const button = reactionButtonRefs.current[activeReactionMessage];
//       if (picker?.contains(event.target) || button?.contains(event.target)) return;
//       setActiveReactionMessage(null);
//     };

//     document.addEventListener("pointerdown", onPointerDown);
//     requestAnimationFrame(update);

//     return () => {
//       window.removeEventListener("resize", update);
//       window.removeEventListener("scroll", update, true);
//       document.removeEventListener("pointerdown", onPointerDown);
//     };
//   }, [activeReactionMessage]);

//   async function toggleReaction(messageId, reaction) {
//     const user = currentUserRef.current || (await getCurrentUser());

//     if (!user) {
//       setImageError("Please sign in before reacting to a message.");
//       setActiveReactionMessage(null);
//       return;
//     }

//     const current = reactions[messageId] || { counts: {}, myReaction: null };
//     const oldReaction = current.myReaction;
//     const nextReaction = oldReaction === reaction ? null : reaction;

//     // Optimistic update.
//     setReactions((state) => {
//       const previous = state[messageId] || { counts: {}, myReaction: null };
//       const counts = { ...previous.counts };

//       if (oldReaction) {
//         counts[oldReaction] = Math.max(0, (counts[oldReaction] || 0) - 1);
//         if (counts[oldReaction] === 0) delete counts[oldReaction];
//       }

//       if (nextReaction) {
//         counts[nextReaction] = (counts[nextReaction] || 0) + 1;
//       }

//       return {
//         ...state,
//         [messageId]: { counts, myReaction: nextReaction },
//       };
//     });

//     setActiveReactionMessage(null);

//     let error = null;

//     if (nextReaction) {
//       const result = await supabase
//         .from("chat_message_reactions")
//         .upsert(
//           {
//             message_id: messageId,
//             user_id: user.id,
//             reaction: nextReaction,
//           },
//           { onConflict: "message_id,user_id" }
//         );
//       error = result.error;
//     } else {
//       const result = await supabase
//         .from("chat_message_reactions")
//         .delete()
//         .eq("message_id", messageId)
//         .eq("user_id", user.id);
//       error = result.error;
//     }

//     if (error) {
//       console.error("Reaction update failed:", error);
//       await loadReactions(messagesRef.current.map((message) => message.id));
//     }
//   }

//   useEffect(() => {
//     if (!open) return undefined;

//     let cancelled = false;

//     const messagesChannel = supabase
//       .channel(`chat-messages-${line}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "chat_messages",
//           filter: `line=eq.${line}`,
//         },
//         async (payload) => {
//           if (cancelled) return;
//           const changedMessage = payload.new || payload.old;
//           if (!changedMessage || changedMessage.line !== line) return;
//           await loadMessages();
//         }
//       )
//       .subscribe();

//     const reactionsChannel = supabase
//       .channel(`chat-reactions-${line}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "chat_message_reactions",
//         },
//         async (payload) => {
//           if (cancelled) return;
//           const changedReaction = payload.new || payload.old;
//           if (!changedReaction?.message_id) return;
//           const ids = messagesRef.current.map((message) => message.id);
//           if (ids.includes(changedReaction.message_id)) await loadReactions(ids);
//         }
//       )
//       .subscribe();

//     loadMessages();

//     return () => {
//       cancelled = true;
//       setActiveReactionMessage(null);
//       supabase.removeChannel(messagesChannel);
//       supabase.removeChannel(reactionsChannel);
//     };
//   }, [open, line]);

//   async function sendMessage() {
//     if (!isAuthenticated) {
//       window.location.href = signInUrl;
//       return;
//     }
//     if (sending) return;
//     if (!text.trim() && !selectedImage) return;

//     setSending(true);
//     setImageError("");

//     try {
//       let imageUrl = null;
//       let videoUrl = null;

//       if (selectedImage) {
//         const safeName = selectedImage.name
//           .replace(/\s+/g, "-")
//           .replace(/[^a-zA-Z0-9._-]/g, "");

//         const fileName = `${Date.now()}_${safeName}`;
//         const bucket = selectedImage.type.startsWith("video/")
//           ? "chat-videos"
//           : "chat-images";

//         const { error: uploadError } = await supabase.storage
//           .from(bucket)
//           .upload(fileName, selectedImage, {
//             contentType: selectedImage.type,
//             upsert: false,
//           });

//         if (uploadError) throw uploadError;

//         const { data: publicUrlData } = supabase.storage
//           .from(bucket)
//           .getPublicUrl(fileName);

//         if (selectedImage.type.startsWith("video/")) {
//           videoUrl = publicUrlData?.publicUrl || null;
//         } else {
//           imageUrl = publicUrlData?.publicUrl || null;
//         }
//       }

//       const user = await getCurrentUser();
//       const payload = {
//         username: "TrainLive User",
//         message: text.trim(),
//         line,
//         image_url: imageUrl,
//         ...(videoUrl ? { video_url: videoUrl } : {}),
//       };

//       const { data, error } = await supabase
//         .from("chat_messages")
//         .insert(payload)
//         .select()
//         .single();

//       if (error) throw error;

//       if (data) {
//         setMessages((prev) => {
//           if (prev.some((message) => message.id === data.id)) return prev;
//           const next = [...prev, data];
//           messagesRef.current = next;
//           return next;
//         });
//       }

//       setText("");
//       clearSelectedImage();
//     } catch (error) {
//       console.error("Chat upload/send error:", error);
//       setImageError(error?.message || "Could not send your message.");
//     } finally {
//       setSending(false);
//     }
//   }

//   const panel = (
//     <div
//       ref={chatPanelRef}
//       className="fixed inset-y-0 left-0 z-[2147483000] flex w-[min(440px,100vw)] flex-col border-r border-slate-200 bg-white shadow-[8px_0_30px_rgba(15,23,42,0.16)]"
//       style={{ isolation: "isolate" }}
//     >
//       <div className="relative z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
//         <div className="flex min-w-0 items-center gap-3">
//           {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff6b16] text-[11px] font-black text-white shadow-sm">
//             chatter
//           </div> */}
//           <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
//   {/* Pulsing rings */}
//   <span className="absolute inset-0 rounded-full bg-[#ff6b16]/35 animate-ping" />

//   <span
//     className="absolute inset-[-3px] rounded-full  animate-pulse"
//   />

//   {/* Chatter button */}
//   <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#ff6b16] text-[11px] font-black text-white shadow-sm">
//     chatter
//   </div>
// </div>
          
//         </div>
//         <button
//           type="button"
//           onClick={() => {
//             setOpen(false);
//             setActiveReactionMessage(null);
//           }}
//           aria-label="Close chatter"
//           className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
//         >
//           <X size={20} />
//         </button>
//       </div>

//       <div className="relative z-20 shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-3">
//         <label
//           htmlFor="chat-line"
//           className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
//         >
//           Chat channel
//         </label>
//         <select
//           id="chat-line"
//           value={line}
//           onChange={(e) => setLine(e.target.value)}
//           className="h-11 w-full rounded-xl border-0 px-3.5 text-sm font-semibold capitalize text-white outline-none ring-0"
//           style={{ backgroundColor: CHAT_LINE_COLORS[line] || "#334155" }}
//         >
//           {TUBE_LINES.map((item) => (
//             <option
//               key={item}
//               value={item}
//               style={{
//                 backgroundColor: CHAT_LINE_COLORS[item] || "#334155",
//                 color: "#fff",
//               }}
//             >
//               {item} line
//             </option>
//           ))}
//         </select>
//       </div>

//       {!authLoading && !isAuthenticated && (
//         <div className="relative z-[25] shrink-0 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-amber-50 px-3 py-2.5">
//           <div className="flex items-center gap-2.5">
//             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
//               <MessageCircle size={16} />
//             </div>
//             <div className="min-w-0 flex-1">
//               <p className="text-[12px] font-bold text-slate-800">Sign in to unlock the full chat</p>
//               <p className="text-[10px] leading-4 text-slate-500">Some messages are blurred until you sign in.</p>
//             </div>
//             <button
//               type="button"
//               onClick={() => { window.location.href = signInUrl; }}
//               className="shrink-0 rounded-full bg-[#168cff] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0b7fe6]"
//             >
//               Sign in
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="relative z-10 flex-1 overflow-y-auto bg-[#efeae2] px-3 py-4 [scrollbar-width:thin]">
//         {messages.length === 0 ? (
//           <div className="flex h-full flex-col items-center justify-center px-8 text-center">
//             <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
//               <MessageCircle size={24} />
//             </div>
//             <p className="text-sm font-bold text-slate-800">Start the conversation</p>
//             <p className="mt-1 max-w-[270px] text-xs leading-5 text-slate-500">
//               Share a delay, ask a question, or help another passenger.
//             </p>
//           </div>
//         ) : (
//           messages.map((message, index) => {
//             const reactionState = reactions[message.id] || { counts: {}, myReaction: null };
//             const myReaction = reactionState.myReaction;
//             const summary = Object.entries(reactionState.counts)
//               .sort((a, b) => b[1] - a[1])
//               .slice(0, 3);
//             const pickerOpen = activeReactionMessage === message.id;
//             // Guests can preview the conversation; selected messages are softly blurred until sign-in.
//             const guestLocked = !isAuthenticated && !authLoading && index % 3 === 2;

//             return (
//               <div key={message.id || index} className="mb-3 flex w-full justify-start">
//                 <div className="group relative w-full max-w-[94%]">
//                   <div className="relative rounded-[14px] rounded-tl-[4px] bg-white px-3 py-2 text-slate-800 shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
//                     <p className="mb-1 text-[11px] font-bold text-slate-700">
//                       {message.username || "TrainLive User"}
//                     </p>

//                     <div className={guestLocked ? "relative overflow-hidden rounded-lg" : "relative"}>
//                       <div className={guestLocked ? "pointer-events-none select-none blur-[8px] scale-[1.01] transition-all duration-300" : ""} aria-hidden={guestLocked}>
//                         {message.message && (
//                           <p className="break-words whitespace-pre-wrap pr-1 text-[13.5px] leading-[1.22rem] text-slate-700">
//                             {message.message}
//                           </p>
//                         )}

//                         {message.image_url && (
//                           <div className="mt-1.5 overflow-hidden rounded-lg">
//                             <img
//                               src={message.image_url}
//                               alt="Shared in chat"
//                               className="max-h-64 w-full object-cover"
//                               loading="lazy"
//                             />
//                           </div>
//                         )}

//                         {message.video_url && (
//                           <video
//                             src={message.video_url}
//                             controls
//                             className="mt-1.5 max-h-64 w-full rounded-lg"
//                           />
//                         )}
//                       </div>
//                     </div>

//                     <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-slate-400">
//                       {formatMessageTime(message.created_at)}
//                     </div>

//                     {totalReactionCount(reactionState) > 0 && (
//                       <button
//                         type="button"
//                         onClick={() => {
//                           if (!isAuthenticated) {
//                             window.location.href = signInUrl;
//                             return;
//                           }
//                           openReactionPicker(message.id);
//                         }}
//                         className="absolute -bottom-3 left-3 flex h-7 items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 shadow-sm transition hover:scale-[1.03]"
//                         aria-label="Change reaction"
//                       >
//                         {summary.map(([emoji]) => (
//                           <span key={emoji} className="text-[15px] leading-none">{emoji}</span>
//                         ))}
//                         <span className="ml-0.5 text-[10px] font-semibold text-slate-500">
//                           {totalReactionCount(reactionState)}
//                         </span>
//                       </button>
//                     )}
//                   </div>

//                   <button
//                     ref={(element) => {
//                       reactionButtonRefs.current[message.id] = element;
//                     }}
//                     type="button"
//                     onClick={() => {
//                       if (!isAuthenticated) {
//                         window.location.href = signInUrl;
//                         return;
//                       }
//                       openReactionPicker(message.id);
//                     }}
//                     aria-label={isAuthenticated ? "Add reaction" : "Sign in to react"}
//                     aria-expanded={pickerOpen}
//                     className={`absolute -right-3 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:scale-105 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 sm:opacity-0 sm:group-hover:opacity-100 ${
//                       pickerOpen ? "opacity-100" : ""
//                     }`}
//                   >
//                     <Smile size={16} />
//                   </button>
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       <div className="pointer-events-none absolute inset-x-0 bottom-[76px] z-40 h-56 overflow-hidden" aria-hidden="true">
//         {flyingEmojis.map((item) => (
//           <span
//             key={item.id}
//             className="chat-flying-emoji absolute bottom-0 text-3xl"
//             style={{ left: `${item.left}%` }}
//           >
//             {item.emoji}
//           </span>
//         ))}
//       </div>

//       {selectedImage && (
//         <div className="relative z-50 flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-3 py-2.5">
//           {selectedIsVideo ? (
//             <video
//               src={URL.createObjectURL(selectedImage)}
//               className="h-12 w-16 rounded-lg object-cover"
//               muted
//             />
//           ) : (
//             <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
//           )}
//           <div className="min-w-0 flex-1 truncate text-xs text-slate-500">{selectedImage.name}</div>
//           <button
//             type="button"
//             onClick={clearSelectedImage}
//             className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
//             aria-label="Remove attachment"
//           >
//             <X size={16} />
//           </button>
//         </div>
//       )}

//       {imageError && (
//         <div className="relative z-50 shrink-0 border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
//           {imageError}
//         </div>
//       )}

//       <div className="relative z-50 shrink-0 border-t border-slate-200 bg-[#f7f8fa] p-3">
//         <>

//         <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white p-1.5 pl-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/10">
//           <div className="relative shrink-0">
//             <button
//               type="button"
//               aria-label="Add emoji"
//               onClick={() => {
//                 setEmojiOpen((value) => !value);
//                 setShareOpen(false);
//               }}
//               className={`flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 ${emojiOpen ? "bg-slate-100 text-slate-800" : ""}`}
//             >
//               <Smile size={19} />
//             </button>
//           </div>

//           <input
//             ref={fileInputRef}
//             type="file"
//             accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
//             className="hidden"
//             onChange={handleImageSelection}
//           />
//           <input
//             ref={cameraInputRef}
//             type="file"
//             accept="image/*"
//             capture="environment"
//             className="hidden"
//             onChange={handleImageSelection}
//           />

//           <button
//             type="button"
//             aria-label="Attach image or video"
//             onClick={() => fileInputRef.current?.click()}
//             className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
//           >
//             <Paperclip size={18} />
//           </button>

//           <button
//             type="button"
//             aria-label="Take a photo"
//             onClick={() => cameraInputRef.current?.click()}
//             className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
//           >
//             <Camera size={18} />
//           </button>

//           <input
//             aria-label="Chat message"
//             className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400"
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 sendMessage();
//               }
//             }}
//             placeholder="Type a message"
//           />

//           {text.trim() || selectedImage ? (
//             <button
//               type="button"
//               onClick={sendMessage}
//               aria-label="Send message"
//               disabled={sending}
//               className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#168cff] text-white shadow-sm transition hover:bg-[#0b7fe6] disabled:bg-slate-300"
//             >
//               {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
//             </button>
//           ) : (
//             <button
//               type="button"
//               aria-label="Share TrainLive"
//               onClick={() => {
//                 setShareOpen((value) => !value);
//                 setEmojiOpen(false);
//               }}
//               className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 ${shareOpen ? "bg-slate-100 text-slate-800" : ""}`}
//             >
//               <Share2 size={18} />
//             </button>
//           )}
//         </div>

//         {emojiOpen && (
//           <div className="mt-2 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
//             {CHAT_EMOJIS.map((emoji) => (
//               <button
//                 key={emoji}
//                 type="button"
//                 onClick={() => {
//                   useEmoji(emoji);
//                   setEmojiOpen(false);
//                 }}
//                 className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl hover:bg-slate-100"
//                 aria-label={`Use ${emoji}`}
//               >
//                 {emoji}
//               </button>
//             ))}
//           </div>
//         )}

//         {shareOpen && (
//           <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
//             <span className="px-2 text-xs font-semibold text-slate-500">Share</span>
//             <div className="flex flex-1 items-center gap-1 overflow-x-auto">
//               {SOCIAL_SHARE_OPTIONS.map(([label, icon, base]) => (
//                 <button
//                   key={label}
//                   type="button"
//                   onClick={() =>
//                     window.open(
//                       `${base}${encodeURIComponent(window.location.href)}`,
//                       "_blank",
//                       "noopener,noreferrer"
//                     )
//                   }
//                   className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
//                   style={{ backgroundColor: `#${icon.hex}` }}
//                   aria-label={`Share on ${label}`}
//                   title={label}
//                 >
//                   <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
//                     <path d={icon.path} />
//                   </svg>
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}
//         </>
//       </div>
//     </div>
//   );

//   const reactionPicker = activeReactionMessage && reactionPickerStyle
//     ? createPortal(
//         <div
//           id="trainlive-reaction-picker"
//           className="z-[2147483647] rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_10px_35px_rgba(15,23,42,0.22)]"
//           style={reactionPickerStyle}
//           role="dialog"
//           aria-label="Message reactions"
//         >
//           <div className="flex items-center justify-center gap-0.5">
//             {REACTION_EMOJIS.map((emoji) => {
//               const messageReaction = reactions[activeReactionMessage]?.myReaction;
//               return (
//                 <button
//                   key={emoji}
//                   type="button"
//                   onClick={() => toggleReaction(activeReactionMessage, emoji)}
//                   className={`flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:scale-125 hover:bg-slate-100 active:scale-95 ${
//                     messageReaction === emoji ? "bg-blue-50 ring-2 ring-blue-200" : ""
//                   }`}
//                   aria-label={`React ${emoji}`}
//                 >
//                   {emoji}
//                 </button>
//               );
//             })}
//           </div>
//         </div>,
//         document.body
//       )
//     : null;


//   return (
//     <>
//       <style>{`
//         .chatter-launcher {
//           isolation: isolate;
//         }
//         .chatter-pulse-ring {
//           position: absolute;
//           inset: 4px;
//           border-radius: 9999px;
//           border: 2px solid rgba(255, 107, 22, 0.42);
//           pointer-events: none;
//           animation: trainlive-chatter-pulse 2.2s ease-out infinite;
//         }
//         .chatter-pulse-ring--two {
//           animation-delay: 1.1s;
//         }
//         @keyframes trainlive-chatter-pulse {
//           0% { transform: scale(0.92); opacity: 0.8; }
//           70%, 100% { transform: scale(1.55); opacity: 0; }
//         }
//         @media (prefers-reduced-motion: reduce) {
//           .chatter-pulse-ring { animation: none; opacity: 0; }
//         }
//       `}</style>
//       {!open &&
//         createPortal(
//           <button
//             type="button"
//             onClick={() => setOpen(true)}
//             aria-label="Open chatter"
//             className="chatter-launcher fixed bottom-5 left-5 z-[2147483000] flex h-16 w-16 items-center justify-center rounded-full text-[10px] font-black text-white transition hover:-translate-y-0.5"
//           >
//             <span className="chatter-pulse-ring chatter-pulse-ring--one" aria-hidden="true" />
//             <span className="chatter-pulse-ring chatter-pulse-ring--two" aria-hidden="true" />
//             <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff6b16] shadow-[0_8px_24px_rgba(255,107,22,0.38)]">chatter</span>
//           </button>,
//           document.body
//         )}

//       {open && createPortal(panel, document.body)}
//       {reactionPicker}
//     </>
//   );
// }


import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Camera,
  Loader2,
  Share2,
  Smile,
} from "lucide-react";
import { siFacebook, siInstagram, siTiktok, siX } from "simple-icons";
import { supabase } from "../supabase";
import { lineTextColors } from "./lineColors";

const CHAT_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// Change this if your app uses a different authentication route.
const DEFAULT_SIGN_IN_URL = "/login";

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

const CHAT_LINE_COLORS = {
  ...lineTextColors,
  "great western railway": "#4b1f4f",
};

const CHAT_EMOJIS = ["❤️", "😂", "😡", "😮", "👍", "🚀"];
const REACTION_EMOJIS = ["❤️", "😂", "😡", "😮", "👍", "🚀"];

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

function formatMessageTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat([], {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function totalReactionCount(reactionState) {
  return Object.values(reactionState?.counts || {}).reduce(
    (total, value) => total + value,
    0
  );
}

export default function MapChat({ signInUrl = DEFAULT_SIGN_IN_URL }) {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [selectedIsVideo, setSelectedIsVideo] = useState(false);
  const [sending, setSending] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [flyingEmojis, setFlyingEmojis] = useState([]);
  const [reactions, setReactions] = useState({});
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const [reactionPickerStyle, setReactionPickerStyle] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const currentUserRef = useRef(null);
  const messagesRef = useRef([]);
  const reactionButtonRefs = useRef({});
  const chatPanelRef = useRef(null);
  const navigate = useNavigate()
  async function getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Could not get current user:", error);
      return null;
    }

    currentUserRef.current = user || null;
    setIsAuthenticated(Boolean(user));
    setAuthLoading(false);
    return user || null;
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("Could not read auth session:", error);
      const user = data?.session?.user || null;
      currentUserRef.current = user;
      setIsAuthenticated(Boolean(user));
      setAuthLoading(false);
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      currentUserRef.current = user;
      setIsAuthenticated(Boolean(user));
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, []);

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

    if (isVideo) setImagePreview("");
    else setImagePreview(URL.createObjectURL(file));

    event.target.value = "";
  };

  const clearSelectedImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview("");
    setImageError("");
    setSelectedIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const useEmoji = (emoji) => {
    setText((current) => `${current}${emoji}`);
    const id = `${Date.now()}-${Math.random()}`;
    setFlyingEmojis((current) => [
      ...current,
      { id, emoji, left: 12 + Math.random() * 72 },
    ]);
    window.setTimeout(() => {
      setFlyingEmojis((current) => current.filter((item) => item.id !== id));
    }, 1800);
  };

  async function loadMessages() {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("line", line)
      .gte(
        "created_at",
        new Date(Date.now() - CHAT_VISIBILITY_WINDOW_MS).toISOString()
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Could not load chat messages:", error);
      return [];
    }

    const nextMessages = data || [];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    await loadReactions(nextMessages.map((message) => message.id));
    return nextMessages;
  }

  async function loadReactions(messageIds) {
    if (!messageIds.length) {
      setReactions({});
      return;
    }

    const user = currentUserRef.current || (await getCurrentUser());

    const { data, error } = await supabase
      .from("chat_message_reactions")
      .select("message_id, user_id, reaction")
      .in("message_id", messageIds);

    if (error) {
      console.error("Could not load reactions:", error);
      return;
    }

    const next = {};

    for (const item of data || []) {
      if (!next[item.message_id]) {
        next[item.message_id] = { counts: {}, myReaction: null };
      }

      next[item.message_id].counts[item.reaction] =
        (next[item.message_id].counts[item.reaction] || 0) + 1;

      if (user && item.user_id === user.id) {
        next[item.message_id].myReaction = item.reaction;
      }
    }

    setReactions(next);
  }

  function positionReactionPicker(messageId) {
    const button = reactionButtonRefs.current[messageId];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const pickerWidth = 292;
    const horizontalPadding = 10;
    const left = Math.max(
      horizontalPadding,
      Math.min(
        rect.right - pickerWidth,
        window.innerWidth - pickerWidth - horizontalPadding
      )
    );

    const spaceAbove = rect.top;
    const pickerHeight = 52;
    const top =
      spaceAbove >= pickerHeight + 10
        ? rect.top - pickerHeight - 10
        : Math.min(window.innerHeight - pickerHeight - 10, rect.bottom + 10);

    setReactionPickerStyle({
      position: "fixed",
      left,
      top,
      width: pickerWidth,
    });
  }

  function openReactionPicker(messageId) {
    const next = activeReactionMessage === messageId ? null : messageId;
    setActiveReactionMessage(next);
    if (next) requestAnimationFrame(() => positionReactionPicker(next));
  }

  useEffect(() => {
    if (!activeReactionMessage) return undefined;

    const update = () => positionReactionPicker(activeReactionMessage);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    const onPointerDown = (event) => {
      const picker = document.getElementById("trainlive-reaction-picker");
      const button = reactionButtonRefs.current[activeReactionMessage];
      if (picker?.contains(event.target) || button?.contains(event.target)) return;
      setActiveReactionMessage(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [activeReactionMessage]);

  async function toggleReaction(messageId, reaction) {
    const user = currentUserRef.current || (await getCurrentUser());

    if (!user) {
      setImageError("Please sign in before reacting to a message.");
      setActiveReactionMessage(null);
      return;
    }

    const current = reactions[messageId] || { counts: {}, myReaction: null };
    const oldReaction = current.myReaction;
    const nextReaction = oldReaction === reaction ? null : reaction;

    // Optimistic update.
    setReactions((state) => {
      const previous = state[messageId] || { counts: {}, myReaction: null };
      const counts = { ...previous.counts };

      if (oldReaction) {
        counts[oldReaction] = Math.max(0, (counts[oldReaction] || 0) - 1);
        if (counts[oldReaction] === 0) delete counts[oldReaction];
      }

      if (nextReaction) {
        counts[nextReaction] = (counts[nextReaction] || 0) + 1;
      }

      return {
        ...state,
        [messageId]: { counts, myReaction: nextReaction },
      };
    });

    setActiveReactionMessage(null);

    let error = null;

    if (nextReaction) {
      const result = await supabase
        .from("chat_message_reactions")
        .upsert(
          {
            message_id: messageId,
            user_id: user.id,
            reaction: nextReaction,
          },
          { onConflict: "message_id,user_id" }
        );
      error = result.error;
    } else {
      const result = await supabase
        .from("chat_message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id);
      error = result.error;
    }

    if (error) {
      console.error("Reaction update failed:", error);
      await loadReactions(messagesRef.current.map((message) => message.id));
    }
  }

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const messagesChannel = supabase
      .channel(`chat-messages-${line}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `line=eq.${line}`,
        },
        async (payload) => {
          if (cancelled) return;
          const changedMessage = payload.new || payload.old;
          if (!changedMessage || changedMessage.line !== line) return;
          await loadMessages();
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`chat-reactions-${line}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_message_reactions",
        },
        async (payload) => {
          if (cancelled) return;
          const changedReaction = payload.new || payload.old;
          if (!changedReaction?.message_id) return;
          const ids = messagesRef.current.map((message) => message.id);
          if (ids.includes(changedReaction.message_id)) await loadReactions(ids);
        }
      )
      .subscribe();

    loadMessages();

    return () => {
      cancelled = true;
      setActiveReactionMessage(null);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [open, line]);

  async function sendMessage() {
    if (!isAuthenticated) {
      window.location.href = signInUrl;
      return;
    }
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

      const user = await getCurrentUser();
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

      if (error) throw error;

      if (data) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === data.id)) return prev;
          const next = [...prev, data];
          messagesRef.current = next;
          return next;
        });
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

  const panel = (
    <div
      ref={chatPanelRef}
      className="trainlive-chat-panel fixed z-[2147483000] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.28)]
        left-3 right-3 bottom-3 h-[min(680px,calc(100dvh-24px))]
        sm:left-5 sm:right-auto sm:bottom-5 sm:w-[400px] sm:h-[min(680px,calc(100dvh-40px))]"
      style={{ isolation: "isolate" }}
    >
      <div className="relative z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            {/* Pulsing rings */}
            <span className="absolute inset-0 rounded-full bg-[#ff6b16]/35 animate-ping" />

            <span className="absolute inset-[-3px] rounded-full  animate-pulse" />

            {/* Chatter button */}
            <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#ff6b16] text-[11px] font-black text-white shadow-sm">
              chatter
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setActiveReactionMessage(null);
          }}
          aria-label="Close chatter"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative z-20 shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <label
          htmlFor="chat-line"
          className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
        >
          Chat channel
        </label>
        <select
          id="chat-line"
          value={line}
          onChange={(e) => setLine(e.target.value)}
          className="h-11 w-full rounded-xl border-0 px-3.5 text-sm font-semibold capitalize text-white outline-none ring-0"
          style={{ backgroundColor: CHAT_LINE_COLORS[line] || "#334155" }}
        >
          {TUBE_LINES.map((item) => (
            <option
              key={item}
              value={item}
              style={{
                backgroundColor: CHAT_LINE_COLORS[item] || "#334155",
                color: "#fff",
              }}
            >
              {item} line
            </option>
          ))}
        </select>
      </div>

      {!authLoading && !isAuthenticated && (
        <div className="relative z-[25] shrink-0 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-amber-50 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <MessageCircle size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-800">Sign in to unlock the full chat</p>
              <p className="text-[10px] leading-4 text-slate-500">Some messages are blurred until you sign in.</p>
            </div>
            {/* <button
              type="button"
              onClick={() => { window.location.href = signInUrl; }}
              className="shrink-0 rounded-full bg-[#168cff] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0b7fe6]"
            >
              Sign in
            </button> */}

            <button
  type="button"
  onClick={() => navigate('/signin')}
  className="shrink-0 rounded-full bg-[#168cff] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0b7fe6]"
>
  Sign in
</button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 overflow-y-auto bg-[#efeae2] px-3 py-4 [scrollbar-width:thin]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
              <MessageCircle size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">Start the conversation</p>
            <p className="mt-1 max-w-[270px] text-xs leading-5 text-slate-500">
              Share a delay, ask a question, or help another passenger.
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const reactionState = reactions[message.id] || { counts: {}, myReaction: null };
            const myReaction = reactionState.myReaction;
            const summary = Object.entries(reactionState.counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            const pickerOpen = activeReactionMessage === message.id;
            // Guests can preview the conversation; selected messages are softly blurred until sign-in.
            const guestLocked = !isAuthenticated && !authLoading && index % 3 === 2;

            return (
              <div key={message.id || index} className="mb-3 flex w-full justify-start">
                <div className="group relative w-full max-w-[94%]">
                  <div className="relative rounded-[14px] rounded-tl-[4px] bg-white px-3 py-2 text-slate-800 shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
                    <p className="mb-1 text-[11px] font-bold text-slate-700">
                      {message.username || "TrainLive User"}
                    </p>

                    <div className={guestLocked ? "relative overflow-hidden rounded-lg" : "relative"}>
                      <div className={guestLocked ? "pointer-events-none select-none blur-[8px] scale-[1.01] transition-all duration-300" : ""} aria-hidden={guestLocked}>
                        {message.message && (
                          <p className="break-words whitespace-pre-wrap pr-1 text-[13.5px] leading-[1.22rem] text-slate-700">
                            {message.message}
                          </p>
                        )}

                        {message.image_url && (
                          <div className="mt-1.5 overflow-hidden rounded-lg">
                            <img
                              src={message.image_url}
                              alt="Shared in chat"
                              className="max-h-64 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {message.video_url && (
                          <video
                            src={message.video_url}
                            controls
                            className="mt-1.5 max-h-64 w-full rounded-lg"
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-slate-400">
                      {formatMessageTime(message.created_at)}
                    </div>

                    {totalReactionCount(reactionState) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAuthenticated) {
                            window.location.href = signInUrl;
                            return;
                          }
                          openReactionPicker(message.id);
                        }}
                        className="absolute -bottom-3 left-3 flex h-7 items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 shadow-sm transition hover:scale-[1.03]"
                        aria-label="Change reaction"
                      >
                        {summary.map(([emoji]) => (
                          <span key={emoji} className="text-[15px] leading-none">{emoji}</span>
                        ))}
                        <span className="ml-0.5 text-[10px] font-semibold text-slate-500">
                          {totalReactionCount(reactionState)}
                        </span>
                      </button>
                    )}
                  </div>

                  <button
                    ref={(element) => {
                      reactionButtonRefs.current[message.id] = element;
                    }}
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        window.location.href = signInUrl;
                        return;
                      }
                      openReactionPicker(message.id);
                    }}
                    aria-label={isAuthenticated ? "Add reaction" : "Sign in to react"}
                    aria-expanded={pickerOpen}
                    className={`absolute -right-3 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:scale-105 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 sm:opacity-0 sm:group-hover:opacity-100 ${
                      pickerOpen ? "opacity-100" : ""
                    }`}
                  >
                    <Smile size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[76px] z-40 h-56 overflow-hidden" aria-hidden="true">
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
        <div className="relative z-50 flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-3 py-2.5">
          {selectedIsVideo ? (
            <video
              src={URL.createObjectURL(selectedImage)}
              className="h-12 w-16 rounded-lg object-cover"
              muted
            />
          ) : (
            <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1 truncate text-xs text-slate-500">{selectedImage.name}</div>
          <button
            type="button"
            onClick={clearSelectedImage}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Remove attachment"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {imageError && (
        <div className="relative z-50 shrink-0 border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {imageError}
        </div>
      )}

      <div className="relative z-50 shrink-0 border-t border-slate-200 bg-[#f7f8fa] p-3">
        <>
          <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white p-1.5 pl-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/10">
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Add emoji"
                onClick={() => {
                  setEmojiOpen((value) => !value);
                  setShareOpen(false);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 ${emojiOpen ? "bg-slate-100 text-slate-800" : ""}`}
              >
                <Smile size={19} />
              </button>
            </div>

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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              aria-label="Take a photo"
              onClick={() => cameraInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Camera size={18} />
            </button>

            <input
              aria-label="Chat message"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message"
            />

            {text.trim() || selectedImage ? (
              <button
                type="button"
                onClick={sendMessage}
                aria-label="Send message"
                disabled={sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#168cff] text-white shadow-sm transition hover:bg-[#0b7fe6] disabled:bg-slate-300"
              >
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            ) : (
              <button
                type="button"
                aria-label="Share TrainLive"
                onClick={() => {
                  setShareOpen((value) => !value);
                  setEmojiOpen(false);
                }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 ${shareOpen ? "bg-slate-100 text-slate-800" : ""}`}
              >
                <Share2 size={18} />
              </button>
            )}
          </div>

          {emojiOpen && (
            <div className="mt-2 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {CHAT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    useEmoji(emoji);
                    setEmojiOpen(false);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl hover:bg-slate-100"
                  aria-label={`Use ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {shareOpen && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <span className="px-2 text-xs font-semibold text-slate-500">Share</span>
              <div className="flex flex-1 items-center gap-1 overflow-x-auto">
                {SOCIAL_SHARE_OPTIONS.map(([label, icon, base]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      window.open(
                        `${base}${encodeURIComponent(window.location.href)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    style={{ backgroundColor: `#${icon.hex}` }}
                    aria-label={`Share on ${label}`}
                    title={label}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                      <path d={icon.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      </div>
    </div>
  );

  const reactionPicker = activeReactionMessage && reactionPickerStyle
    ? createPortal(
        <div
          id="trainlive-reaction-picker"
          className="z-[2147483647] rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_10px_35px_rgba(15,23,42,0.22)]"
          style={reactionPickerStyle}
          role="dialog"
          aria-label="Message reactions"
        >
          <div className="flex items-center justify-center gap-0.5">
            {REACTION_EMOJIS.map((emoji) => {
              const messageReaction = reactions[activeReactionMessage]?.myReaction;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => toggleReaction(activeReactionMessage, emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:scale-125 hover:bg-slate-100 active:scale-95 ${
                    messageReaction === emoji ? "bg-blue-50 ring-2 ring-blue-200" : ""
                  }`}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <style>{`
        .chatter-launcher {
          isolation: isolate;
        }
        .chatter-pulse-ring {
          position: absolute;
          inset: 4px;
          border-radius: 9999px;
          border: 2px solid rgba(255, 107, 22, 0.42);
          pointer-events: none;
          animation: trainlive-chatter-pulse 2.2s ease-out infinite;
        }
        .chatter-pulse-ring--two {
          animation-delay: 1.1s;
        }
        @keyframes trainlive-chatter-pulse {
          0% { transform: scale(0.92); opacity: 0.8; }
          70%, 100% { transform: scale(1.55); opacity: 0; }
        }
        .trainlive-chat-panel {
          transform-origin: bottom left;
          animation: trainlive-chat-pop 0.22s ease-out;
        }
        @keyframes trainlive-chat-pop {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .chatter-pulse-ring { animation: none; opacity: 0; }
          .trainlive-chat-panel { animation: none; }
        }
      `}</style>
      {!open &&
        createPortal(
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open chatter"
            className="chatter-launcher fixed bottom-5 left-5 z-[2147483000] flex h-16 w-16 items-center justify-center rounded-full text-[10px] font-black text-white transition hover:-translate-y-0.5"
          >
            <span className="chatter-pulse-ring chatter-pulse-ring--one" aria-hidden="true" />
            <span className="chatter-pulse-ring chatter-pulse-ring--two" aria-hidden="true" />
            <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff6b16] shadow-[0_8px_24px_rgba(255,107,22,0.38)]">chatter</span>
          </button>,
          document.body
        )}

      {open && createPortal(panel, document.body)}
      {reactionPicker}
    </>
  );
}