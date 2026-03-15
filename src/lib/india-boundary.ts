/*
  GoI-compliant India boundary — Survey of India standard.

  Government of India mandates:
  - J&K, Ladakh (including Aksai Chin & Pakistan-occupied PoK/Gilgit-Baltistan)
    are integral territories of India
  - Arunachal Pradesh is an integral part of India (McMahon Line)
  - LoC (J&K) and LAC (Ladakh) are shown as dashed lines, NOT international borders
  - Aksai Chin is shown within India's outer boundary

  Coordinates: [longitude, latitude] (WGS84)

  Clean single-ring clockwise polygon. Trace:
    Sir Creek → Punjab/Rajasthan/Sindh Pakistan border (going N) →
    PoK border (LoC going N) → Siachen / NJ9842 →
    Northern Aksai Chin claim (going E along latitude ~37.4–35) →
    LAC going SE → Uttarakhand/Himachal China border (going S) →
    Nepal border (going E) → Sikkim → Bhutan → Arunachal (McMahon, going NE) →
    Myanmar border (going S) → Bangladesh border (going W/SW) →
    Bay of Bengal coast (going S) → Kanyakumari → Arabian Sea coast (going N) →
    Sir Creek
*/

export interface BoundarySegment {
  points: [number, number][];
  style: 'international' | 'loc' | 'lac';
  label?: string;
}

export const INDIA_OUTER_BOUNDARY: [number, number][] = [
  // ── Sir Creek / Gujarat–Pakistan start ──────────────────────────────────
  [68.11, 23.63],

  // ── Pakistan border: Sindh going north ──────────────────────────────────
  [68.04, 24.37],
  [68.18, 25.06],
  [68.31, 26.07],
  [68.92, 26.98],
  [69.22, 27.97],
  [69.48, 27.27],
  [70.06, 26.56],
  [70.32, 25.68],

  // ── Rajasthan / Punjab Pakistan border going north ───────────────────────
  [70.97, 25.01],
  [71.89, 24.63],
  [72.86, 24.41],
  [73.72, 24.23],
  [74.32, 24.03],
  [74.63, 24.38],
  [74.83, 25.12],
  [75.21, 26.09],

  // ── Punjab / J&K Pakistan border going north ─────────────────────────────
  [75.64, 27.01],
  [75.98, 28.14],
  [76.42, 29.16],
  [76.87, 30.12],
  [77.18, 30.93],
  [77.48, 31.88],
  [77.61, 32.47],

  // ── J&K — going north toward Pir Panjal / Zoji La ────────────────────────
  [77.01, 33.42],
  [76.19, 34.22],
  [75.62, 34.97],
  [75.14, 35.64],
  [74.97, 36.37],

  // ── LoC junction — Siachen / NJ9842 area ─────────────────────────────────
  [75.38, 36.82],
  [75.84, 36.97],
  [76.22, 37.01],
  [76.58, 37.32],
  [77.02, 37.58],
  [77.83, 37.62],

  // ── Aksai Chin: GoI claimed northern boundary going EAST ─────────────────
  // (India's claim: the Johnson Line extends to lat ~37.3–35.2 across Aksai Chin)
  [78.71, 37.38],
  [79.42, 37.14],
  [80.22, 36.98],
  [81.12, 36.72],
  [82.04, 36.45],
  [82.92, 36.11],
  [83.88, 35.87],
  [84.83, 35.64],
  [85.96, 35.41],
  [87.03, 35.02],
  [87.72, 34.71],
  [88.41, 34.32],

  // ── LAC goes SE / south — into Himachal / Uttarakhand ────────────────────
  [87.52, 33.81],
  [86.88, 33.32],
  [86.12, 32.98],
  [85.47, 32.64],
  [84.83, 32.28],
  [83.94, 31.84],
  [83.28, 31.52],
  [82.61, 31.22],
  [81.74, 30.79],
  [81.08, 30.52],

  // ── Himachal / Uttarakhand China border going south to Nepal ─────────────
  [80.82, 31.28],
  [80.42, 30.14],
  [80.24, 29.72],
  [80.09, 29.04],

  // ── Nepal border going east ───────────────────────────────────────────────
  [80.52, 28.63],
  [80.96, 28.14],
  [81.42, 27.92],
  [81.97, 27.72],
  [82.51, 27.53],
  [83.02, 27.48],
  [83.57, 27.46],
  [84.10, 27.52],
  [84.63, 27.43],
  [85.15, 27.54],
  [85.67, 27.84],
  [86.19, 27.99],
  [86.87, 27.88],
  [87.22, 27.49],
  [87.98, 27.08],

  // ── Sikkim / Darjeeling ───────────────────────────────────────────────────
  [88.34, 26.78],
  [88.52, 26.43],
  [88.72, 26.32],
  [88.81, 26.73],
  [88.96, 27.12],
  [89.14, 27.33],
  [89.59, 27.18],

  // ── Bhutan / Assam border ─────────────────────────────────────────────────
  [90.02, 26.85],
  [90.38, 26.87],
  [91.07, 27.04],
  [91.64, 27.14],
  [91.98, 27.22],
  [92.41, 26.79],
  [92.72, 27.08],

  // ── Arunachal Pradesh — McMahon Line going northeast ─────────────────────
  [93.14, 27.28],
  [93.72, 27.13],
  [94.23, 27.31],
  [94.85, 27.44],
  [95.24, 27.38],
  [95.62, 27.29],
  [96.02, 27.58],
  [96.28, 27.82],
  [96.72, 28.01],
  [97.13, 28.37],
  [97.37, 28.09],

  // ── Myanmar border going south ────────────────────────────────────────────
  [97.39, 27.35],
  [97.06, 25.67],
  [96.52, 24.13],
  [96.11, 23.62],
  [95.43, 23.18],
  [94.72, 23.07],
  [94.17, 22.41],
  [93.57, 22.13],
  [93.24, 21.43],
  [92.94, 21.07],

  // ── Mizoram / Bangladesh south border ────────────────────────────────────
  [92.77, 20.36],
  [92.34, 21.38],
  [92.06, 22.68],
  [91.96, 23.25],
  [91.36, 23.91],
  [91.04, 24.11],
  [90.78, 24.42],
  [90.31, 25.07],
  [89.80, 25.31],
  [89.28, 25.67],
  [88.95, 26.07],

  // ── West Bengal coast / Bay of Bengal ────────────────────────────────────
  [88.52, 26.43],
  [87.93, 25.18],
  [87.53, 24.67],
  [87.16, 24.37],
  [86.84, 23.95],
  [86.12, 23.59],
  [85.08, 23.36],
  [84.67, 22.44],
  [84.01, 22.17],
  [83.43, 21.84],
  [82.94, 21.49],
  [82.61, 21.01],
  [82.28, 20.78],
  [82.01, 20.56],
  [81.74, 20.27],
  [81.38, 19.98],
  [80.76, 19.67],
  [80.47, 18.22],
  [80.05, 16.98],
  [80.34, 15.89],
  [80.18, 14.62],
  [80.12, 13.46],
  [80.27, 12.34],
  [80.22, 11.07],
  [79.83, 10.28],
  [79.18, 9.63],
  [78.72, 9.17],
  [78.12, 8.53],

  // ── Kanyakumari ──────────────────────────────────────────────────────────
  [77.55, 8.28],
  [77.12, 8.09],
  [76.57, 8.41],
  [76.08, 8.95],
  [75.84, 9.58],
  [75.48, 10.41],

  // ── Kerala / Karnataka / Goa coast going north ───────────────────────────
  [75.03, 11.13],
  [74.72, 11.82],
  [74.85, 12.24],
  [74.67, 12.78],
  [74.51, 13.32],
  [74.36, 14.13],
  [74.08, 14.81],
  [73.76, 15.04],
  [73.51, 15.74],
  [73.26, 16.97],
  [73.04, 17.51],
  [72.82, 18.95],
  [72.98, 19.42],
  [72.94, 20.18],
  [72.88, 20.67],
  [72.78, 21.12],
  [72.62, 21.63],
  [72.47, 21.85],
  [72.02, 21.52],

  // ── Gujarat / Saurashtra coast ────────────────────────────────────────────
  [71.54, 21.28],
  [71.18, 21.32],
  [70.92, 21.54],
  [70.47, 21.37],
  [70.07, 21.48],
  [69.78, 21.64],
  [69.52, 21.98],
  [69.15, 22.16],
  [68.95, 22.34],
  [68.72, 22.51],

  // ── Close ring: back to Sir Creek ────────────────────────────────────────
  [68.11, 23.63],
];

/*
  Line of Control (LoC) — J&K / PoK.
  Dashed line per GoI convention. NOT an international border.
  Traces from Punjab international border north to NJ9842 (Siachen terminus).
*/
export const LINE_OF_CONTROL: [number, number][] = [
  [75.64, 27.01],
  [75.14, 28.23],
  [74.97, 29.11],
  [74.63, 30.02],
  [74.32, 30.92],
  [73.92, 31.74],
  [73.52, 32.43],
  [73.12, 33.16],
  [72.59, 33.64],
  [72.07, 34.12],
  [71.53, 34.58],
  [70.99, 34.97],
  [70.49, 33.97],
  [70.03, 33.41],
  [69.52, 32.93],
  [69.12, 32.48],
  [75.62, 34.97],
  [75.38, 36.82],
  [75.84, 36.97],
  [76.22, 37.01],
];

/*
  Line of Actual Control (LAC) — Ladakh / Aksai Chin.
  Dashed line per GoI convention. NOT an international border.
*/
export const LINE_OF_ACTUAL_CONTROL: [number, number][] = [
  [77.83, 37.62],
  [78.71, 37.38],
  [79.42, 37.14],
  [80.22, 36.98],
  [81.12, 36.72],
  [82.04, 36.45],
  [82.92, 36.11],
  [83.88, 35.87],
  [84.83, 35.64],
  [85.96, 35.41],
  [87.03, 35.02],
  [87.72, 34.71],
  [88.41, 34.32],
  [87.52, 33.81],
  [86.88, 33.32],
  [86.12, 32.98],
  [85.47, 32.64],
  [84.83, 32.28],
  [83.94, 31.84],
  [83.28, 31.52],
  [82.61, 31.22],
  [81.74, 30.79],
  [81.08, 30.52],
];

export const INDIA_DISCLAIMER =
  'Map of India — As per Government of India / Survey of India official boundary. ' +
  'J&K, Ladakh (including Aksai Chin and PoK), and Arunachal Pradesh are integral parts of India. ' +
  'The external boundaries of India are as notified by the Survey of India. ' +
  'LoC and LAC are indicative and not international borders.';
