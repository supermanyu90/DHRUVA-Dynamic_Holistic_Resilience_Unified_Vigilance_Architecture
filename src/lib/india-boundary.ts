/*
  India boundary — Government of India / Survey of India official claim.

  Source: udit-001/india-maps-data (district-level GeoJSON, GoI administrative data)

  GoI position:
  - J&K, Ladakh (including Aksai Chin and PoK/Gilgit-Baltistan) integral to India
  - Arunachal Pradesh integral to India (McMahon Line)
  - Northern tip [74.708°E, 37.077°N] — Afghan/Wakhan tripoint
  - Aksai Chin eastern extent [80.326°E, 35.469°N]

  Two shapes rendered together:
  1. MAIN BODY — mainland India from Pakistan border to east coast, south coast, west coast
  2. NORTHERN TERRITORY — the Gilgit-Baltistan / PoK / Ladakh / Aksai Chin appendage

  The two shapes share a common boundary along the LoC/LAC line and together
  form the complete GoI-claimed territory.

  Coordinates: [longitude, latitude] (WGS84)
*/

/*
  Main India body — from the LoC/Punjab junction clockwise around the subcontinent
  back to the LoC junction. Includes: Punjab, Himachal, Uttarakhand, Nepal border,
  Sikkim, Arunachal (McMahon Line), Myanmar border, northeast states, Bangladesh border,
  east coast, south tip, west coast, Gujarat, Rajasthan, Pakistan border up to LoC start.
*/
export const INDIA_MAIN_BODY: [number, number][] = [
  // Pakistan international border: Gujarat (Sir Creek) → Punjab (LoC junction)
  [68.100552, 23.692000],
  [68.176645, 23.691965],
  [68.764000, 24.296000],
  [68.842599, 24.359134],
  [71.04324,  24.356524],
  [70.844699, 25.215102],
  [70.665000, 25.397000],
  [70.282873, 25.722229],
  [70.168927, 26.491872],
  [69.514393, 26.940966],
  [70.616496, 27.989196],
  [71.777666, 27.913180],
  [72.823752, 28.961592],
  [73.450638, 29.976413],
  [74.421380, 30.979815],
  [74.405929, 31.692639],
  [75.258642, 32.271105],
  [74.451559, 32.764900],
  [74.104294, 33.441473],
  [73.749948, 34.317699],
  // LoC start — GoI-claimed J&K boundary goes north from here
  [73.390000, 34.374000],
  [73.447000, 34.574000],
  [73.749948, 34.787000],
  [74.066000, 35.048000],
  [74.240203, 34.748887],
  [75.757061, 34.504923],
  [76.871722, 34.653544],
  [76.934670, 35.783314],
  // Northern Ladakh ridge (southern edge of GB/Aksai Chin appendage)
  [77.115114, 35.797062],
  [77.430127, 35.654087],
  [77.612100, 35.468495],
  [77.817011, 35.512488],
  [78.040273, 35.586724],
  [78.271180, 35.721450],
  [78.422570, 35.784689],
  [78.664182, 35.857551],
  [78.821688, 35.854801],
  [78.959315, 35.891920],
  [79.214689, 35.978529],
  [79.376783, 35.995026],
  // Aksai Chin dip and eastern extent
  [79.592399, 34.500668],
  [79.869182, 35.781939],
  [79.997633, 35.836930],
  [80.106206, 35.680208],
  [80.289814, 35.606846],
  [80.326409, 35.469870],  // Aksai Chin easternmost
  // Descend to Nepal border
  [80.088425, 28.794470],
  [81.057203, 28.416095],
  [81.999987, 27.925479],
  [83.304249, 27.364506],
  [84.675018, 27.234901],
  [85.251779, 26.726198],
  [86.024393, 26.630985],
  [87.227472, 26.397898],
  [88.060238, 26.414615],
  [88.174804, 26.810405],
  [88.043133, 27.445819],
  [88.120441, 27.876542],
  // Sikkim / Arunachal / McMahon Line
  [88.619000, 28.098000],
  [88.730326, 28.086865],
  [88.814248, 27.299316],
  [88.835643, 27.098966],
  [89.744528, 26.719403],
  [90.373275, 26.875724],
  [91.217513, 26.808648],
  [92.033484, 26.838310],
  [92.103712, 27.452614],
  [91.696657, 27.771742],
  [92.503119, 27.896876],
  [92.896000, 28.204000],
  [93.340000, 28.640000],
  [93.493000, 28.684000],
  [94.187000, 29.039000],
  [94.580000, 29.281000],
  [95.253000, 29.109000],
  [95.704000, 29.299000],
  [96.089000, 29.459000],
  [96.394000, 29.253000],
  [96.608000, 28.794000],
  [97.089000, 28.362000],
  // Myanmar border (east face)
  [97.388000, 28.004000],
  [97.402561, 27.882536],
  [97.157000, 27.814000],
  [97.051989, 27.699059],
  [97.133999, 27.083774],
  [96.419366, 27.264589],
  [95.124768, 26.573572],
  [95.155153, 26.001307],
  [94.603249, 25.162495],
  [94.552658, 24.675238],
  [94.106742, 23.850741],
  [93.325188, 24.078556],
  [93.286327, 23.043658],
  [93.060294, 22.703111],
  [93.166128, 22.278460],
  [92.672721, 22.041239],
  // Bangladesh border
  [92.146035, 23.627499],
  [91.869928, 23.624346],
  [91.706475, 22.985264],
  [91.158963, 23.503527],
  [91.467730, 24.072639],
  [91.915093, 24.130414],
  [92.376202, 24.976693],
  [91.799596, 25.147432],
  [90.872211, 25.132601],
  [89.920693, 25.269750],
  [89.832481, 25.965082],
  [89.355094, 26.014407],
  [88.563049, 26.446526],
  [88.209789, 25.768066],
  [88.931554, 25.238692],
  [88.306373, 24.866079],
  [88.084422, 24.501657],
  [88.699940, 24.233715],
  [88.529770, 23.631142],
  [88.876312, 22.879146],
  [89.031961, 22.055708],
  [88.888766, 21.690588],
  [88.208497, 21.703172],
  // East coast: Bay of Bengal
  [86.975704, 21.495562],
  [87.033169, 20.743308],
  [86.499351, 20.151638],
  [85.060266, 19.478579],
  [83.941006, 18.302010],
  [83.189217, 17.671221],
  [82.192792, 17.016636],
  [82.191242, 16.556664],
  [81.692719, 16.310219],
  [80.791999, 15.951972],
  [80.324896, 15.899185],
  [80.025069, 15.136415],
  [80.233274, 13.835771],
  [80.286294, 13.006261],
  [79.862547, 12.056215],
  [79.857999, 10.357275],
  [79.340512, 10.308854],
  [78.885345,  9.546136],
  [79.189720,  9.216544],
  [78.277941,  8.933047],
  [77.941165,  8.252959],
  [77.539898,  7.965535],  // Kanyakumari
  // West coast: Arabian Sea
  [76.592979,  8.899276],
  [76.130061, 10.299630],
  [75.746467, 11.308251],
  [75.396101, 11.781245],
  [74.864816, 12.741936],
  [74.616717, 13.992583],
  [74.443859, 14.617222],
  [73.766000, 15.495000],
  [73.534199, 15.990652],
  [73.119909, 17.928570],
  [72.820909, 19.208234],
  [72.824475, 20.419503],
  [72.630533, 21.356009],
  [71.175273, 20.757441],
  [70.470459, 20.877331],
  [69.859000, 22.088000],
  [69.164130, 22.089298],
  [68.100552, 23.692000],  // close back to Sir Creek
];

/*
  Northern Territory appendage — Gilgit-Baltistan / PoK boundary per GoI claim.
  Traces a loop: from the LoC/Ladakh ridge junction, north to the Afghan tripoint,
  back east along the Karakoram, then back west to the junction.
  Rendered as a filled shape matching the main body fill color.
*/
export const INDIA_NORTHERN_TERRITORY: [number, number][] = [
  // South edge: Ladakh ridge (matches main body) — west to east
  [76.871722, 34.653544],
  [76.934670, 35.783314],
  [76.719055, 36.083011],
  [76.642595, 36.183368],
  [76.350520, 36.359336],
  [76.254182, 36.346963],
  [75.922348, 36.502311],
  [75.748020, 36.587545],
  [75.614981, 36.760764],
  [75.342786, 37.052212],
  [75.208217, 37.035715],
  [75.017069, 36.975226],
  [74.977069, 37.009140],
  // Afghan/Wakhan tripoint — northernmost
  [74.708173, 37.076958],
  // South along Karakoram going west back to junction
  [74.657977, 37.057248],
  [74.585838, 37.043964],
  [74.531473, 36.985992],
  [74.428331, 36.988974],
  [74.367760, 36.958196],
  [74.260197, 36.885929],
  [74.168369, 36.902364],
  [74.120162, 36.831855],
  [74.055210, 36.806131],
  [73.993657, 36.825790],
  [73.912478, 36.870768],
  [73.877824, 36.894116],
  [73.808297, 36.716126],
  [73.782590, 36.701470],
  [73.700058, 36.684288],
  [73.632408, 36.689341],
  [73.543110, 36.708545],
  [73.440476, 36.744267],
  [73.313778, 36.706019],
  [73.188626, 36.721179],
  [73.125463, 36.686528],
  [73.060768, 36.537227],
  [72.990895, 36.456944],
  [72.879264, 36.443196],
  [72.594835, 36.261729],
  [72.594835, 36.026646],
  [72.530609, 36.073387],
  [72.533668, 35.916665],
  // Rejoin main body at LoC junction
  [73.390000, 34.374000],
  [73.749948, 34.317699],
  [74.104294, 33.441473],
  [74.240203, 34.748887],
  [75.757061, 34.504923],
  [76.871722, 34.653544],  // close
];

/*
  Combined: use INDIA_MAIN_BODY for the primary shape.
  INDIA_NORTHERN_TERRITORY is rendered as a second filled <path> on top.
*/
export const INDIA_OUTER_BOUNDARY = INDIA_MAIN_BODY;

// Kept for backward compatibility — now part of the solid boundary polygon
export const LINE_OF_CONTROL: [number, number][] = [];
export const LINE_OF_ACTUAL_CONTROL: [number, number][] = [];

export const INDIA_DISCLAIMER =
  'Map of India — As per Government of India / Survey of India official boundary. ' +
  'J&K, Ladakh (including Aksai Chin and PoK/Gilgit-Baltistan) and Arunachal Pradesh are integral parts of India.';
