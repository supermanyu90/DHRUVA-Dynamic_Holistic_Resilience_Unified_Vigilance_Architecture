/**
 * Country centroid lookup (approximate geographic centers).
 *
 * Used to place events that only carry a country name (e.g. ReliefWeb RSS
 * disaster items) on the map. Not exhaustive — unknown countries resolve to
 * null and simply aren't plotted.
 */

// Lowercase country name -> [latitude, longitude]
const CENTROIDS: Record<string, [number, number]> = {
  afghanistan: [33.9, 67.7], albania: [41.15, 20.17], algeria: [28.03, 1.66],
  angola: [-11.2, 17.87], argentina: [-38.42, -63.62], armenia: [40.07, 45.04],
  australia: [-25.27, 133.78], azerbaijan: [40.14, 47.58], bangladesh: [23.68, 90.36],
  belarus: [53.71, 27.95], benin: [9.31, 2.32], bhutan: [27.51, 90.43],
  bolivia: [-16.29, -63.59], 'bosnia and herzegovina': [43.92, 17.68], botswana: [-22.33, 24.68],
  brazil: [-14.24, -51.93], 'burkina faso': [12.24, -1.56], burundi: [-3.37, 29.92],
  cambodia: [12.57, 104.99], cameroon: [7.37, 12.35], 'central african republic': [6.61, 20.94],
  chad: [15.45, 18.73], chile: [-35.68, -71.54], china: [35.86, 104.2],
  colombia: [4.57, -74.3], comoros: [-11.65, 43.33], 'congo': [-0.23, 15.83],
  'democratic republic of the congo': [-4.04, 21.76], 'dr congo': [-4.04, 21.76],
  'costa rica': [9.75, -83.75], 'ivory coast': [7.54, -5.55], "cote d'ivoire": [7.54, -5.55],
  croatia: [45.1, 15.2], cuba: [21.52, -77.78], cyprus: [35.13, 33.43],
  djibouti: [11.83, 42.59], dominica: [15.41, -61.37], 'dominican republic': [18.74, -70.16],
  ecuador: [-1.83, -78.18], egypt: [26.82, 30.8], 'el salvador': [13.79, -88.9],
  eritrea: [15.18, 39.78], ethiopia: [9.15, 40.49], fiji: [-17.71, 178.07],
  gabon: [-0.8, 11.61], gambia: [13.44, -15.31], georgia: [42.32, 43.36],
  ghana: [7.95, -1.02], greece: [39.07, 21.82], guatemala: [15.78, -90.23],
  guinea: [9.95, -9.7], 'guinea-bissau': [11.8, -15.18], guyana: [4.86, -58.93],
  haiti: [18.97, -72.29], honduras: [15.2, -86.24], india: [20.59, 78.96],
  indonesia: [-0.79, 113.92], iran: [32.43, 53.69], iraq: [33.22, 43.68],
  israel: [31.05, 34.85], italy: [41.87, 12.57], jamaica: [18.11, -77.3],
  japan: [36.2, 138.25], jordan: [30.59, 36.24], kazakhstan: [48.02, 66.92],
  kenya: [-0.02, 37.91], kiribati: [-3.37, -168.73], kosovo: [42.6, 20.9],
  kuwait: [29.31, 47.48], kyrgyzstan: [41.2, 74.77], laos: [19.86, 102.5],
  lebanon: [33.85, 35.86], lesotho: [-29.61, 28.23], liberia: [6.43, -9.43],
  libya: [26.34, 17.23], madagascar: [-18.77, 46.87], malawi: [-13.25, 34.3],
  malaysia: [4.21, 101.98], maldives: [3.2, 73.22], mali: [17.57, -3.996],
  mauritania: [21.01, -10.94], mexico: [23.63, -102.55], 'micronesia': [7.43, 150.55],
  moldova: [47.41, 28.37], mongolia: [46.86, 103.85], montenegro: [42.71, 19.37],
  morocco: [31.79, -7.09], mozambique: [-18.67, 35.53], myanmar: [21.91, 95.96],
  namibia: [-22.96, 18.49], nepal: [28.39, 84.12], nicaragua: [12.87, -85.21],
  niger: [17.61, 8.08], nigeria: [9.08, 8.68], 'north korea': [40.34, 127.51],
  'north macedonia': [41.61, 21.75], pakistan: [30.38, 69.35], palestine: [31.95, 35.23],
  'occupied palestinian territory': [31.95, 35.23], panama: [8.54, -80.78],
  'papua new guinea': [-6.31, 143.96], paraguay: [-23.44, -58.44], peru: [-9.19, -75.02],
  philippines: [12.88, 121.77], 'republic of korea': [35.91, 127.77], romania: [45.94, 24.97],
  russia: [61.52, 105.32], 'russian federation': [61.52, 105.32], rwanda: [-1.94, 29.87],
  samoa: [-13.76, -172.1], 'saudi arabia': [23.89, 45.08], senegal: [14.5, -14.45],
  serbia: [44.02, 21.01], 'sierra leone': [8.46, -11.78], solomon: [-9.65, 160.16],
  'solomon islands': [-9.65, 160.16], somalia: [5.15, 46.2], 'south africa': [-30.56, 22.94],
  'south korea': [35.91, 127.77], 'south sudan': [6.88, 31.31], 'sri lanka': [7.87, 80.77],
  sudan: [12.86, 30.22], suriname: [3.92, -56.03], syria: [34.8, 38.997],
  'syrian arab republic': [34.8, 38.997], taiwan: [23.7, 120.96], tajikistan: [38.86, 71.28],
  tanzania: [-6.37, 34.89], thailand: [15.87, 100.99], 'timor-leste': [-8.87, 125.73],
  togo: [8.62, 0.82], tonga: [-21.18, -175.2], tunisia: [33.89, 9.54],
  turkey: [38.96, 35.24], turkiye: [38.96, 35.24], turkmenistan: [38.97, 59.56],
  tuvalu: [-7.11, 177.65], uganda: [1.37, 32.29], ukraine: [48.38, 31.17],
  'united arab emirates': [23.42, 53.85], uruguay: [-32.52, -55.77],
  uzbekistan: [41.38, 64.59], vanuatu: [-15.38, 166.96], venezuela: [6.42, -66.59],
  vietnam: [14.06, 108.28], yemen: [15.55, 48.52], zambia: [-13.13, 27.85],
  zimbabwe: [-19.02, 29.15],
};

// Common ReliefWeb / news naming variants -> canonical key above.
const ALIASES: Record<string, string> = {
  'drc': 'democratic republic of the congo',
  'congo, dem. rep.': 'democratic republic of the congo',
  'congo dr': 'democratic republic of the congo',
  'car': 'central african republic',
  'lao': 'laos',
  "lao people's democratic republic": 'laos',
  'viet nam': 'vietnam',
  'iran (islamic republic of)': 'iran',
  'venezuela (bolivarian republic of)': 'venezuela',
  'bolivia (plurinational state of)': 'bolivia',
  'tanzania, united republic of': 'tanzania',
  "korea, democratic people's republic of": 'north korea',
  'korea, republic of': 'south korea',
  'state of palestine': 'palestine',
  'republic of moldova': 'moldova',
  'the gambia': 'gambia',
};

/** Resolve a country name to [lat, lon], or null if unknown. */
export function centroidForCountry(name: string | null | undefined): [number, number] | null {
  if (!name) return null;
  // Compound feeds like "DR Congo/Uganda" or "Kenya and Somalia" — use the first.
  const first = name.split(/\s*[/,]\s*|\s+and\s+/i)[0];
  let key = first.trim().toLowerCase();
  key = key.replace(/\s*\(.*?\)\s*/g, '').trim(); // strip parentheticals
  if (ALIASES[key]) key = ALIASES[key];
  return CENTROIDS[key] ?? null;
}
