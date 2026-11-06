const underground = (id, displayName, reportLineId, backgroundKey, themeColour, aliases = []) => ({
  id: `underground_${id}`,
  displayName,
  type: "london",
  group: "underground",
  aliases: [id, ...aliases],
  backgroundKey,
  reportLineId,
  themeColour,
});

export const MAIN_CHAT_CHANNELS = [
  underground("central", "Central Line", "central", "central", "#DC241F"),
  underground("jubilee", "Jubilee Line", "jubilee", "jubilee", "#A0A5A9"),
  underground("northern", "Northern Line", "northern", "northern", "#1A1A1A"),
  underground("piccadilly", "Piccadilly Line", "piccadilly", "piccadilly", "#003688"),
  underground("victoria", "Victoria Line", "victoria", "victoria", "#0098D4"),
  underground("district", "District Line", "district", "district", "#00782A"),
  underground("circle", "Circle Line", "circle", "circle", "#FFD300"),
  underground("hammersmith-and-city", "Hammersmith & City Line", "hammersmith-and-city", "hammersmith & city", "#F3A9BB", ["hammersmith city"]),
  underground("metropolitan", "Metropolitan Line", "metropolitan", "metropolitan", "#9B0056"),
  underground("bakerloo", "Bakerloo Line", "bakerloo", "bakerloo", "#B36305"),
  underground("elizabeth", "Elizabeth Line", "elizabeth", "elizabeth", "#6950A1"),
  { id: "london_overground", displayName: "London Overground", type: "london", group: "london", aliases: ["overground"], themeColour: "#EE7C0E", reportLineId: "london-overground" },
  { id: "dlr", displayName: "DLR", type: "london", group: "london", aliases: ["docklands light railway"], themeColour: "#00A4A7", reportLineId: "dlr" },
  { id: "london_trams", displayName: "London Trams", type: "london", group: "london", aliases: ["trams", "tramlink"], themeColour: "#84B817", reportLineId: "tramlink" },
];

export const NATIONAL_RAIL_CHANNELS = [
  "Avanti West Coast",
  "c2c",
  "Caledonian Sleeper",
  "Chiltern Railways",
  "CrossCountry",
  "East Midlands Railway",
  "Gatwick Express",
  "Grand Central",
  "Great Northern",
  "Great Western Railway",
  "Greater Anglia",
  "Heathrow Express",
  "Hull Trains",
  "LNER",
  "London Northwestern Railway",
  "Lumo",
  "Merseyrail",
  "Northern",
  "ScotRail",
  "South Western Railway",
  "Southeastern",
  "Southern",
  "Stansted Express",
  "Thameslink",
  "TransPennine Express",
  "Transport for Wales",
  "West Midlands Railway",
].map((displayName) => ({
  id: `national_rail_${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
  type: "national",
  displayName,
  group: "nationalRail",
  aliases: displayName === "Great Western Railway"
    ? ["gwr"]
    : displayName === "South Western Railway"
      ? ["swr"]
      : displayName === "Northern"
        ? ["northern trains"]
        : [],
  themeColour: "#334155",
}));

export const CHAT_CHANNELS = [...MAIN_CHAT_CHANNELS, ...NATIONAL_RAIL_CHANNELS];

export function getChatChannel(channelId) {
  return CHAT_CHANNELS.find((channel) => channel.id === channelId) || MAIN_CHAT_CHANNELS[4];
}

export function channelIdFromLegacyLine(value) {
  const normalized = String(value || "").toLowerCase();
  return CHAT_CHANNELS.find((channel) =>
    channel.reportLineId === normalized ||
    channel.displayName.toLowerCase() === normalized ||
    channel.id === normalized
  )?.id || "underground_central";
}

export function normalizeChannelSearch(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

export function searchChatChannels(query) {
  const normalizedQuery = normalizeChannelSearch(query);
  if (!normalizedQuery) return [];
  return CHAT_CHANNELS.filter((channel) =>
    [channel.displayName, ...(channel.aliases || [])]
      .some((value) => normalizeChannelSearch(value).includes(normalizedQuery))
  );
}
