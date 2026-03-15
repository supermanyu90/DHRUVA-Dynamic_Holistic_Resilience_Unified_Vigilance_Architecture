export const worldMapPaths = `M 100 50 L 150 80 L 200 60 L 250 90 L 300 70 L 350 85 L 400 75 L 450 95 L 500 80 L 550 100 L 600 85 L 650 110 L 700 95 L 750 120 L 800 105 L 850 130 L 900 115 L 950 140 L 1000 125 L 1050 150 L 1100 135 L 1150 160 L 1200 145 L 1250 170 L 1300 155 L 1350 180 L 1400 165 L 1450 190 L 1500 175 L 1550 200 L 1600 185 L 1650 210 L 1700 195 L 1750 220 L 1800 205 L 1850 230 L 1900 215 L 1950 240 L 2000 225 L 2050 250 L 2100 235 L 2150 260 L 2200 245 L 2250 270 L 2300 255 L 2350 280 L 2400 265`;

export interface CountryPath {
  name: string;
  path: string;
}

export const countries: CountryPath[] = [
  { name: 'USA', path: 'M 150 120 L 180 115 L 210 125 L 240 120 L 270 130 L 290 125 L 310 135 L 330 130 L 350 140 L 370 135 L 390 145 L 410 140 L 430 150 L 450 145 L 450 160 L 430 165 L 410 155 L 390 160 L 370 150 L 350 155 L 330 145 L 310 150 L 290 140 L 270 145 L 240 135 L 210 140 L 180 130 L 150 135 Z' },
  { name: 'Canada', path: 'M 130 80 L 160 75 L 190 85 L 220 80 L 250 90 L 280 85 L 310 95 L 340 90 L 370 100 L 400 95 L 430 105 L 460 100 L 490 110 L 490 125 L 460 130 L 430 120 L 400 125 L 370 115 L 340 120 L 310 110 L 280 115 L 250 105 L 220 110 L 190 100 L 160 105 L 130 95 Z' },
  { name: 'Mexico', path: 'M 180 170 L 210 165 L 240 175 L 270 170 L 300 180 L 320 175 L 340 185 L 360 180 L 360 195 L 340 200 L 320 190 L 300 195 L 270 185 L 240 190 L 210 180 L 180 185 Z' },
  { name: 'Brazil', path: 'M 480 280 L 510 275 L 540 285 L 570 280 L 600 290 L 630 285 L 660 295 L 660 320 L 630 325 L 600 315 L 570 320 L 540 310 L 510 315 L 480 305 Z' },
  { name: 'Argentina', path: 'M 440 350 L 470 345 L 500 355 L 530 350 L 530 380 L 500 385 L 470 375 L 440 380 Z' },
  { name: 'UK', path: 'M 930 100 L 950 95 L 970 105 L 970 120 L 950 125 L 930 115 Z' },
  { name: 'France', path: 'M 940 130 L 970 125 L 1000 135 L 1000 150 L 970 155 L 940 145 Z' },
  { name: 'Germany', path: 'M 1020 115 L 1050 110 L 1080 120 L 1080 135 L 1050 140 L 1020 130 Z' },
  { name: 'Spain', path: 'M 900 140 L 930 135 L 960 145 L 960 160 L 930 165 L 900 155 Z' },
  { name: 'Italy', path: 'M 1040 145 L 1070 140 L 1090 150 L 1090 170 L 1070 175 L 1040 165 Z' },
  { name: 'Russia', path: 'M 1100 60 L 1200 55 L 1300 65 L 1400 60 L 1500 70 L 1600 65 L 1700 75 L 1800 70 L 1900 80 L 1900 140 L 1800 145 L 1700 135 L 1600 140 L 1500 130 L 1400 135 L 1300 125 L 1200 130 L 1100 120 Z' },
  { name: 'China', path: 'M 1750 150 L 1850 145 L 1950 155 L 2050 150 L 2050 200 L 1950 205 L 1850 195 L 1750 200 Z' },
  { name: 'India', path: 'M 1550 200 L 1650 195 L 1750 205 L 1750 250 L 1650 255 L 1550 245 Z' },
  { name: 'Japan', path: 'M 2100 160 L 2130 155 L 2160 165 L 2160 190 L 2130 195 L 2100 185 Z' },
  { name: 'Australia', path: 'M 1950 320 L 2050 315 L 2150 325 L 2150 370 L 2050 375 L 1950 365 Z' },
  { name: 'South Africa', path: 'M 1100 340 L 1150 335 L 1200 345 L 1200 380 L 1150 385 L 1100 375 Z' },
  { name: 'Egypt', path: 'M 1080 210 L 1120 205 L 1160 215 L 1160 240 L 1120 245 L 1080 235 Z' },
  { name: 'Saudi Arabia', path: 'M 1200 215 L 1260 210 L 1320 220 L 1320 250 L 1260 255 L 1200 245 Z' },
  { name: 'Iran', path: 'M 1300 190 L 1360 185 L 1420 195 L 1420 225 L 1360 230 L 1300 220 Z' },
  { name: 'Turkey', path: 'M 1120 160 L 1180 155 L 1240 165 L 1240 185 L 1180 190 L 1120 180 Z' },
];

export function latLonToXY(lat: number, lon: number, width: number, height: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

export function xyToLatLon(x: number, y: number, width: number, height: number): { lat: number; lon: number } {
  const lon = (x / width) * 360 - 180;
  const lat = 90 - (y / height) * 180;
  return { lat, lon };
}
