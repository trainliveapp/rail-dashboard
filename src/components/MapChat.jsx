import { useEffect, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "../supabase";


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
  "elizabeth"
];
export default function MapChat() {

  console.log("🔥 MAPCHAT LOADED");

  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");


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
  console.log("SEND BUTTON CLICKED", text);

  if (!text.trim()) {
    console.log("EMPTY MESSAGE");
    return;
  }

  const { error } = await supabase
    .from("chat_messages")
    .insert({
      username: "TrainLive User",
      message: text,
      line: line
    });

  console.log("INSERT RESULT", error);

  if (error) {
    console.error(error);
    return;
  }

  setText("");
}

  return (

    <>

      {!open && (

        <button
  onClick={() => setOpen(true)}
  aria-label="Open LiveChat"

  className="
  ml-2
  bg-blue-600
  text-white
  px-3
  rounded
  "
>
  <MessageCircle size={16}/>
  <span>LiveChat</span>
</button>

      )}



      {open && (

        <div

          className="
          fixed
          right-5
          bottom-5
          z-[2000]
          w-80
          h-96
          bg-white
          rounded-xl
          shadow-2xl
          flex
          flex-col
          "

        >


          <div className="
          flex
          justify-between
          items-center
          p-3
          border-b
          ">


            <h3 className="font-bold">

              🚇 {line}

            </h3>


            <button
              onClick={() => setOpen(false)}
            >

              <X/>

            </button>


          </div>




          <select

            value={line}

            onChange={(e)=>setLine(e.target.value)}

            className="
            m-2
            border
            rounded
            p-2
            "

          >

            {TUBE_LINES.map(item => (

              <option key={item} value={item}>

                {item}

              </option>

            ))}

          </select>





          <div className="
          flex-1
          overflow-y-auto
          p-3
          ">


            {messages.map((m,index)=>(

              <div

                key={index}

                className="
                mb-2
                bg-gray-100
                rounded
                p-2
                "

              >

                <b>{m.username}</b>

                <p>{m.message}</p>


              </div>

            ))}


          </div>





          <div className="
          flex
          p-2
          border-t
          ">


            <input

              className="
              flex-1
              border
              rounded
              px-2
              "

              value={text}

              onChange={(e)=>setText(e.target.value)}

              onKeyDown={(e)=>{

                if(e.key==="Enter"){

                  sendMessage();

                }

              }}

              placeholder="Send message..."

            />


            <button

              onClick={sendMessage}

              className="
              ml-2
              bg-blue-600
              text-white
              px-3
              rounded
              "

            >

              <Send size={16}/>

            </button>


          </div>


        </div>

      )}


    </>

  );

}