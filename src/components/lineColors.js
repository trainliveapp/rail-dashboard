export const lineTextColors = {
  bakerloo: "#b36305",
  central: "#dc241f",
  circle: "#ffd300",
  district: "#00782a",
  elizabeth: "#6950a1",
  hammersmith: "#f3a9bb",
  jubilee: "#a0a5a9",
    metropolitan: "#9B0056",
    northern: "#000000",
    piccadilly: "#003688",
    victoria: "#0098D4",
    waterloo: "#95CDBA",
    overground: "#EE7C0E",
    dlr: "#00A4A7",
    tram: "#84B817",
};

  const LINE_ALIASES = {
    "hammersmith & city": "hammersmith",
    "hammersmith and city": "hammersmith",
    "waterloo & city": "waterloo",
    "waterloo and city": "waterloo",
    "london overground": "overground",
    tramlink: "tram",
  };

  export function lineColorFor(lineName) {
    if (!lineName) return null;

    const normalized = String(lineName).trim().toLowerCase().replace(/\s+line$/, "");
    const key = LINE_ALIASES[normalized] || normalized;
    return lineTextColors[key] || null;
  }

export const lineBgColors = {
  bakerloo: "#b3630533",
  central: "#dc241f33",
  circle: "#ffd30033",
  district: "#00782a33",
  elizabeth: "#6950a133",
  hammersmith: "#f3a9bb33",
  jubilee: "#a0a5a933",
  metropolitan: "#9b005633",
  northern: "#00000033",
  piccadilly: "#00368833",
  victoria: "#0098d433",
  waterloo: "#95cdba33",
  overground: "#ff7b0033",
  dlr: "#00a4a733",
  tram: "#00b35533",
};