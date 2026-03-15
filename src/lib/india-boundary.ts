/*
  GoI-compliant India boundary overlay data — Survey of India standard.

  Government of India mandates:
  - J&K, Ladakh (including Aksai Chin & PoK/Gilgit-Baltistan) are integral parts of India
  - Arunachal Pradesh is an integral part of India (McMahon Line applies)
  - LoC (Line of Control, J&K) and LAC (Line of Actual Control, Ladakh/Arunachal)
    are shown as dashed lines — NOT solid international borders

  The world atlas TopoJSON data is used for the base India country shape.
  These overlay lines are rendered as dashed lines on top of the base map
  to correctly depict the LoC and LAC per GoI convention.

  Coordinates: [longitude, latitude] (WGS84)
*/

export interface BoundarySegment {
  points: [number, number][];
  style: 'international' | 'loc' | 'lac';
  label?: string;
}

/*
  Line of Control (LoC) — J&K / PoK.
  Runs from Punjab international border north to NJ9842 (Siachen glacier).
  Shown as dashed blue line per GoI convention. NOT an international border.
  Pakistan-administered PoK/Gilgit-Baltistan is shown as Indian territory.
*/
export const LINE_OF_CONTROL: [number, number][] = [
  [74.32, 31.72],
  [73.98, 32.14],
  [73.62, 32.54],
  [73.28, 32.96],
  [72.88, 33.42],
  [72.48, 33.88],
  [72.08, 34.28],
  [71.72, 34.68],
  [71.38, 34.96],
  [71.08, 35.14],
  [70.84, 35.42],
  [70.62, 35.68],
  [70.42, 35.92],
  [70.18, 36.14],
  [69.98, 36.32],
  [69.82, 36.58],
  [69.72, 36.82],
  [69.68, 37.08],
  [69.78, 37.34],
  [70.08, 37.52],
  [70.48, 37.62],
  [70.88, 37.72],
  [71.28, 37.82],
  [71.68, 37.88],
  [72.08, 37.94],
  [72.48, 37.98],
  [72.88, 37.98],
  [73.28, 37.94],
  [73.62, 37.84],
  [73.92, 37.68],
  [74.18, 37.48],
  [74.38, 37.22],
  [74.52, 36.94],
  [74.62, 36.64],
  [74.68, 36.32],
  [74.72, 36.04],
  [74.82, 35.78],
  [75.02, 35.54],
  [75.28, 35.34],
  [75.54, 35.16],
  [75.82, 35.02],
  [76.12, 34.88],
  [76.38, 34.72],
  [76.62, 34.54],
  [76.82, 34.28],
  [76.98, 33.98],
  [77.08, 33.68],
  [77.12, 33.38],
];

/*
  Line of Actual Control (LAC) — Ladakh / Aksai Chin / Arunachal.
  Shown as dashed line per GoI convention. NOT an international border.
  India claims Aksai Chin as part of Ladakh UT.
*/
export const LINE_OF_ACTUAL_CONTROL: [number, number][] = [
  [77.12, 33.38],
  [77.42, 33.12],
  [77.78, 32.88],
  [78.18, 32.68],
  [78.62, 32.48],
  [79.08, 32.32],
  [79.58, 32.18],
  [80.08, 32.08],
  [80.58, 32.02],
  [81.08, 31.98],
  [81.58, 31.98],
  [82.08, 32.02],
  [82.58, 32.08],
  [83.08, 32.18],
  [83.58, 32.32],
  [84.08, 32.48],
  [84.58, 32.68],
  [85.08, 32.92],
  [85.58, 33.18],
  [86.08, 33.48],
  [86.58, 33.78],
  [87.08, 34.08],
  [87.58, 34.32],
  [88.08, 34.48],
];

export const INDIA_DISCLAIMER =
  'Map of India — As per Government of India / Survey of India official boundary. ' +
  'J&K, Ladakh (including Aksai Chin and PoK), and Arunachal Pradesh are integral parts of India. ' +
  'The external boundaries of India are as notified by the Survey of India. ' +
  'LoC and LAC are indicative and not international borders.';

/*
  INDIA_OUTER_BOUNDARY is no longer used as a polygon overlay.
  The base India country shape comes from the world atlas TopoJSON data
  which is rendered via the landPaths in WorldMapSVG.
  This export is kept for backward compatibility.
*/
export const INDIA_OUTER_BOUNDARY: [number, number][] = [];
