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
].map((channel, displayOrder) => ({ ...channel, displayOrder }));

export const NATIONAL_RAIL_CHANNELS = [
  ["avanti_west_coast", "Avanti West Coast"],
  ["c2c", "c2c"],
  ["caledonian_sleeper", "Caledonian Sleeper"],
  ["chiltern_railways", "Chiltern Railways"],
  ["crosscountry", "CrossCountry"],
  ["east_midlands_railway", "East Midlands Railway"],
  ["gatwick_express", "Gatwick Express"],
  ["grand_central", "Grand Central"],
  ["great_northern", "Great Northern"],
  ["great_western_railway", "Great Western Railway"],
  ["greater_anglia", "Greater Anglia"],
  ["heathrow_express", "Heathrow Express"],
  ["hull_trains", "Hull Trains"],
  ["lner", "LNER"],
  ["london_northwestern_railway", "London Northwestern Railway"],
  ["lumo", "Lumo"],
  ["merseyrail", "Merseyrail"],
  ["northern", "Northern"],
  ["scotrail", "ScotRail"],
  ["south_western_railway", "South Western Railway"],
  ["southeastern", "Southeastern"],
  ["southern", "Southern"],
  ["stansted_express", "Stansted Express"],
  ["thameslink", "Thameslink"],
  ["transpennine_express", "TransPennine Express"],
  ["transport_for_wales", "Transport for Wales"],
  ["west_midlands_railway", "West Midlands Railway"],
].map(([key, displayName], displayOrder) => ({
  displayOrder,
  id: `national_rail_${key}`,
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
  return CHAT_CHANNELS.find((channel) => channel.id === channelId) || MAIN_CHAT_CHANNELS.find((channel) => channel.id === "underground_central");
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
