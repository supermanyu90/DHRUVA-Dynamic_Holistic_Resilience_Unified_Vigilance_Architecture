/*
  # India Locations Lookup Table

  ## Summary
  Stores district and state-level centroid coordinates for India.
  Used by the location normalisation service to map district/state names
  extracted from SACHET CAP alerts to latitude/longitude.

  ## New Table: india_locations

  | Column       | Type   | Description |
  |--------------|--------|-------------|
  | id           | uuid PK|             |
  | district     | text   | District name (lowercase, normalised) |
  | state        | text   | State name (lowercase, normalised) |
  | latitude     | double | Centroid latitude |
  | longitude    | double | Centroid longitude |
  | level        | text   | 'district' or 'state' |

  ## Notes
  - District names are stored lowercase and trimmed for fuzzy matching.
  - A state-level fallback row exists for each state so alerts with only
    state information still get coordinates.
  - Public SELECT only; no auth writes (data is static reference data).
*/

CREATE TABLE IF NOT EXISTS india_locations (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district  text NOT NULL DEFAULT '',
  state     text NOT NULL,
  latitude  double precision NOT NULL,
  longitude double precision NOT NULL,
  level     text NOT NULL DEFAULT 'district' CHECK (level IN ('district', 'state'))
);

CREATE INDEX IF NOT EXISTS india_locations_district_idx ON india_locations (district);
CREATE INDEX IF NOT EXISTS india_locations_state_idx    ON india_locations (state);
CREATE INDEX IF NOT EXISTS india_locations_level_idx    ON india_locations (level);

ALTER TABLE india_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read india locations"
  ON india_locations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert india locations"
  ON india_locations FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── State-level fallback centroids ───────────────────────────────────────────
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('', 'andhra pradesh',      15.9129,  79.7400, 'state'),
('', 'arunachal pradesh',   28.2180,  94.7278, 'state'),
('', 'assam',               26.2006,  92.9376, 'state'),
('', 'bihar',               25.0961,  85.3131, 'state'),
('', 'chhattisgarh',        21.2787,  81.8661, 'state'),
('', 'goa',                 15.2993,  74.1240, 'state'),
('', 'gujarat',             22.2587,  71.1924, 'state'),
('', 'haryana',             29.0588,  76.0856, 'state'),
('', 'himachal pradesh',    31.1048,  77.1734, 'state'),
('', 'jharkhand',           23.6102,  85.2799, 'state'),
('', 'karnataka',           15.3173,  75.7139, 'state'),
('', 'kerala',              10.8505,  76.2711, 'state'),
('', 'madhya pradesh',      22.9734,  78.6569, 'state'),
('', 'maharashtra',         19.7515,  75.7139, 'state'),
('', 'manipur',             24.6637,  93.9063, 'state'),
('', 'meghalaya',           25.4670,  91.3662, 'state'),
('', 'mizoram',             23.1645,  92.9376, 'state'),
('', 'nagaland',            26.1584,  94.5624, 'state'),
('', 'odisha',              20.9517,  85.0985, 'state'),
('', 'punjab',              31.1471,  75.3412, 'state'),
('', 'rajasthan',           27.0238,  74.2179, 'state'),
('', 'sikkim',              27.5330,  88.5122, 'state'),
('', 'tamil nadu',          11.1271,  78.6569, 'state'),
('', 'telangana',           18.1124,  79.0193, 'state'),
('', 'tripura',             23.9408,  91.9882, 'state'),
('', 'uttar pradesh',       26.8467,  80.9462, 'state'),
('', 'uttarakhand',         30.0668,  79.0193, 'state'),
('', 'west bengal',         22.9868,  87.8550, 'state'),
('', 'delhi',               28.7041,  77.1025, 'state'),
('', 'jammu and kashmir',   33.7782,  76.5762, 'state'),
('', 'ladakh',              34.1526,  77.5770, 'state'),
('', 'puducherry',          11.9416,  79.8083, 'state'),
('', 'chandigarh',          30.7333,  76.7794, 'state'),
('', 'andaman and nicobar', 11.7401,  92.6586, 'state'),
('', 'lakshadweep',         10.5667,  72.6417, 'state'),
('', 'dadra and nagar haveli', 20.1809, 73.0169, 'state'),
('', 'daman and diu',       20.4283,  72.8397, 'state')
ON CONFLICT DO NOTHING;

-- ── District-level coordinates ────────────────────────────────────────────────
-- Andhra Pradesh
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('visakhapatnam',  'andhra pradesh', 17.6868, 83.2185, 'district'),
('vijayawada',     'andhra pradesh', 16.5062, 80.6480, 'district'),
('guntur',         'andhra pradesh', 16.3067, 80.4365, 'district'),
('tirupati',       'andhra pradesh', 13.6288, 79.4192, 'district'),
('kurnool',        'andhra pradesh', 15.8281, 78.0373, 'district'),
('nellore',        'andhra pradesh', 14.4426, 79.9865, 'district'),
('kadapa',         'andhra pradesh', 14.4673, 78.8242, 'district'),
('anantapur',      'andhra pradesh', 14.6819, 77.6006, 'district'),
('chittoor',       'andhra pradesh', 13.2172, 79.1003, 'district'),
('krishna',        'andhra pradesh', 16.6100, 80.7214, 'district'),
('east godavari',  'andhra pradesh', 17.0005, 82.2475, 'district'),
('west godavari',  'andhra pradesh', 16.9174, 81.3380, 'district'),
('srikakulam',     'andhra pradesh', 18.2949, 83.8938, 'district'),
('vizianagaram',   'andhra pradesh', 18.1066, 83.3956, 'district'),
('prakasam',       'andhra pradesh', 15.3370, 79.5744, 'district')
ON CONFLICT DO NOTHING;

-- Arunachal Pradesh
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('itanagar',       'arunachal pradesh', 27.0844, 93.6053, 'district'),
('tawang',         'arunachal pradesh', 27.5859, 91.8594, 'district'),
('west kameng',    'arunachal pradesh', 27.2441, 92.5494, 'district'),
('east siang',     'arunachal pradesh', 28.0749, 95.3408, 'district'),
('upper siang',    'arunachal pradesh', 28.7500, 95.3000, 'district'),
('papum pare',     'arunachal pradesh', 27.1500, 93.6900, 'district'),
('lower subansiri','arunachal pradesh', 27.5000, 93.9000, 'district'),
('lohit',          'arunachal pradesh', 28.0000, 96.2000, 'district'),
('changlang',      'arunachal pradesh', 27.0868, 95.7419, 'district'),
('tirap',          'arunachal pradesh', 26.7000, 95.6000, 'district')
ON CONFLICT DO NOTHING;

-- Assam
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('guwahati',       'assam', 26.1445, 91.7362, 'district'),
('kamrup',         'assam', 26.1445, 91.7362, 'district'),
('kamrup metropolitan', 'assam', 26.1445, 91.7362, 'district'),
('dibrugarh',      'assam', 27.4728, 94.9120, 'district'),
('jorhat',         'assam', 26.7465, 94.2026, 'district'),
('silchar',        'assam', 24.8333, 92.7789, 'district'),
('cachar',         'assam', 24.8333, 92.7789, 'district'),
('nagaon',         'assam', 26.3479, 92.6843, 'district'),
('tinsukia',       'assam', 27.4930, 95.3601, 'district'),
('lakhimpur',      'assam', 27.2347, 94.1007, 'district'),
('sonitpur',       'assam', 26.6384, 92.7940, 'district'),
('barpeta',        'assam', 26.3212, 91.0104, 'district'),
('dhubri',         'assam', 26.0200, 89.9900, 'district'),
('golaghat',       'assam', 26.5200, 93.9700, 'district'),
('sibsagar',       'assam', 26.9858, 94.6399, 'district'),
('nalbari',        'assam', 26.4480, 91.4404, 'district'),
('kokrajhar',      'assam', 26.3987, 90.2712, 'district')
ON CONFLICT DO NOTHING;

-- Bihar
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('patna',          'bihar', 25.5941, 85.1376, 'district'),
('gaya',           'bihar', 24.7964, 85.0002, 'district'),
('muzaffarpur',    'bihar', 26.1209, 85.3647, 'district'),
('bhagalpur',      'bihar', 25.2425, 86.9842, 'district'),
('darbhanga',      'bihar', 26.1542, 85.8918, 'district'),
('purnia',         'bihar', 25.7771, 87.4753, 'district'),
('saran',          'bihar', 25.9200, 84.7400, 'district'),
('sitamarhi',      'bihar', 26.5900, 85.4900, 'district'),
('vaishali',       'bihar', 25.7200, 85.2000, 'district'),
('siwan',          'bihar', 26.2200, 84.3600, 'district'),
('begusarai',      'bihar', 25.4100, 86.1300, 'district'),
('samastipur',     'bihar', 25.8600, 85.7800, 'district'),
('nalanda',        'bihar', 25.0000, 85.5000, 'district'),
('aurangabad',     'bihar', 24.7600, 84.3800, 'district'),
('rohtas',         'bihar', 24.9500, 83.9700, 'district'),
('kaimur',         'bihar', 25.0500, 83.6000, 'district'),
('araria',         'bihar', 26.1500, 87.4700, 'district'),
('east champaran', 'bihar', 26.6500, 84.9100, 'district'),
('west champaran', 'bihar', 27.1300, 84.3100, 'district'),
('madhubani',      'bihar', 26.3500, 86.0700, 'district'),
('supaul',         'bihar', 26.1200, 86.6000, 'district'),
('kishanganj',     'bihar', 26.1000, 87.9400, 'district'),
('khagaria',       'bihar', 25.5000, 86.4700, 'district'),
('saharsa',        'bihar', 25.8800, 86.5900, 'district'),
('madhepura',      'bihar', 25.9200, 87.0000, 'district'),
('gopalganj',      'bihar', 26.4700, 84.4400, 'district')
ON CONFLICT DO NOTHING;

-- Chhattisgarh
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('raipur',         'chhattisgarh', 21.2514, 81.6296, 'district'),
('bilaspur',       'chhattisgarh', 22.0796, 82.1391, 'district'),
('durg',           'chhattisgarh', 21.1904, 81.2849, 'district'),
('bhilai',         'chhattisgarh', 21.1938, 81.3509, 'district'),
('korba',          'chhattisgarh', 22.3595, 82.7501, 'district'),
('raigarh',        'chhattisgarh', 21.9000, 83.4000, 'district'),
('jagdalpur',      'chhattisgarh', 19.0742, 82.0286, 'district'),
('bastar',         'chhattisgarh', 19.0742, 82.0286, 'district'),
('rajnandgaon',    'chhattisgarh', 21.0974, 81.0296, 'district'),
('mahasamund',     'chhattisgarh', 21.1074, 82.0971, 'district'),
('jashpur',        'chhattisgarh', 22.8800, 84.1400, 'district'),
('surguja',        'chhattisgarh', 23.1193, 83.1979, 'district'),
('ambikapur',      'chhattisgarh', 23.1193, 83.1979, 'district'),
('kanker',         'chhattisgarh', 20.2740, 81.4944, 'district'),
('dantewada',      'chhattisgarh', 18.8963, 81.3473, 'district')
ON CONFLICT DO NOTHING;

-- Gujarat
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('ahmedabad',      'gujarat', 23.0225, 72.5714, 'district'),
('surat',          'gujarat', 21.1702, 72.8311, 'district'),
('vadodara',       'gujarat', 22.3072, 73.1812, 'district'),
('rajkot',         'gujarat', 22.3039, 70.8022, 'district'),
('bhavnagar',      'gujarat', 21.7645, 72.1519, 'district'),
('jamnagar',       'gujarat', 22.4707, 70.0577, 'district'),
('junagadh',       'gujarat', 21.5222, 70.4579, 'district'),
('gandhinagar',    'gujarat', 23.2156, 72.6369, 'district'),
('anand',          'gujarat', 22.5645, 72.9289, 'district'),
('mehsana',        'gujarat', 23.5880, 72.3693, 'district'),
('kutch',          'gujarat', 23.7337, 69.8597, 'district'),
('bhuj',           'gujarat', 23.2500, 69.6700, 'district'),
('amreli',         'gujarat', 21.5997, 71.2211, 'district'),
('banaskantha',    'gujarat', 24.1742, 72.4283, 'district'),
('patan',          'gujarat', 23.8493, 72.1266, 'district'),
('surendranagar',  'gujarat', 22.7271, 71.6471, 'district'),
('navsari',        'gujarat', 20.9467, 72.9520, 'district'),
('valsad',         'gujarat', 20.5992, 72.9342, 'district'),
('tapi',           'gujarat', 21.0971, 73.3000, 'district'),
('narmada',        'gujarat', 21.8700, 73.4900, 'district'),
('bharuch',        'gujarat', 21.7051, 72.9959, 'district'),
('kheda',          'gujarat', 22.7500, 72.6800, 'district'),
('sabarkantha',    'gujarat', 23.5800, 73.0200, 'district'),
('panchmahals',    'gujarat', 22.7000, 73.5500, 'district'),
('dahod',          'gujarat', 22.8318, 74.2565, 'district'),
('porbandar',      'gujarat', 21.6418, 69.6293, 'district'),
('morbi',          'gujarat', 22.8173, 70.8380, 'district')
ON CONFLICT DO NOTHING;

-- Haryana
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('gurgaon',        'haryana', 28.4595, 77.0266, 'district'),
('gurugram',       'haryana', 28.4595, 77.0266, 'district'),
('faridabad',      'haryana', 28.4089, 77.3178, 'district'),
('ambala',         'haryana', 30.3782, 76.7767, 'district'),
('hisar',          'haryana', 29.1492, 75.7217, 'district'),
('rohtak',         'haryana', 28.8955, 76.6066, 'district'),
('sonipat',        'haryana', 28.9929, 77.0152, 'district'),
('panipat',        'haryana', 29.3909, 76.9635, 'district'),
('karnal',         'haryana', 29.6857, 76.9905, 'district'),
('kurukshetra',    'haryana', 29.9695, 76.8783, 'district'),
('yamunanagar',    'haryana', 30.1290, 77.2674, 'district'),
('panchkula',      'haryana', 30.6942, 76.8606, 'district'),
('bhiwani',        'haryana', 28.7975, 76.1322, 'district'),
('jhajjar',        'haryana', 28.6037, 76.6560, 'district'),
('rewari',         'haryana', 28.1957, 76.6185, 'district'),
('mahendragarh',   'haryana', 28.2762, 76.1538, 'district'),
('nuh',            'haryana', 28.1067, 77.0093, 'district'),
('palwal',         'haryana', 28.1487, 77.3318, 'district'),
('fatehabad',      'haryana', 29.5142, 75.4558, 'district'),
('sirsa',          'haryana', 29.5345, 75.0269, 'district'),
('jind',           'haryana', 29.3165, 76.3158, 'district'),
('kaithal',        'haryana', 29.8014, 76.3998, 'district')
ON CONFLICT DO NOTHING;

-- Himachal Pradesh
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('shimla',         'himachal pradesh', 31.1048, 77.1734, 'district'),
('manali',         'himachal pradesh', 32.2432, 77.1892, 'district'),
('dharamsala',     'himachal pradesh', 32.2190, 76.3234, 'district'),
('kangra',         'himachal pradesh', 32.0998, 76.2691, 'district'),
('solan',          'himachal pradesh', 30.9045, 77.0967, 'district'),
('mandi',          'himachal pradesh', 31.7088, 76.9320, 'district'),
('kullu',          'himachal pradesh', 31.9572, 77.1097, 'district'),
('chamba',         'himachal pradesh', 32.5534, 76.1258, 'district'),
('hamirpur',       'himachal pradesh', 31.6862, 76.5214, 'district'),
('una',            'himachal pradesh', 31.4685, 76.2710, 'district'),
('bilaspur',       'himachal pradesh', 31.3318, 76.7516, 'district'),
('sirmaur',        'himachal pradesh', 30.5561, 77.4596, 'district'),
('kinnaur',        'himachal pradesh', 31.5932, 78.3200, 'district'),
('lahaul spiti',   'himachal pradesh', 32.5698, 77.4000, 'district'),
('spiti',          'himachal pradesh', 32.2458, 78.0000, 'district')
ON CONFLICT DO NOTHING;

-- Jharkhand
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('ranchi',         'jharkhand', 23.3441, 85.3096, 'district'),
('jamshedpur',     'jharkhand', 22.8046, 86.2029, 'district'),
('dhanbad',        'jharkhand', 23.7957, 86.4304, 'district'),
('bokaro',         'jharkhand', 23.6693, 85.9749, 'district'),
('hazaribagh',     'jharkhand', 23.9925, 85.3637, 'district'),
('deoghar',        'jharkhand', 24.4853, 86.6950, 'district'),
('dumka',          'jharkhand', 24.2675, 87.2497, 'district'),
('giridih',        'jharkhand', 24.1900, 86.3000, 'district'),
('gumla',          'jharkhand', 23.0440, 84.5380, 'district'),
('lohardaga',      'jharkhand', 23.4385, 84.6866, 'district'),
('palamu',         'jharkhand', 24.0300, 84.0600, 'district'),
('simdega',        'jharkhand', 22.6119, 84.5103, 'district'),
('east singhbhum', 'jharkhand', 22.7596, 86.1511, 'district'),
('west singhbhum', 'jharkhand', 22.1466, 85.6000, 'district'),
('seraikela',      'jharkhand', 22.5970, 85.9690, 'district')
ON CONFLICT DO NOTHING;

-- Karnataka
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('bengaluru',      'karnataka', 12.9716, 77.5946, 'district'),
('bangalore',      'karnataka', 12.9716, 77.5946, 'district'),
('mysuru',         'karnataka', 12.2958, 76.6394, 'district'),
('mysore',         'karnataka', 12.2958, 76.6394, 'district'),
('hubballi',       'karnataka', 15.3647, 75.1240, 'district'),
('hubli',          'karnataka', 15.3647, 75.1240, 'district'),
('mangaluru',      'karnataka', 12.9141, 74.8560, 'district'),
('mangalore',      'karnataka', 12.9141, 74.8560, 'district'),
('belagavi',       'karnataka', 15.8497, 74.4977, 'district'),
('belgaum',        'karnataka', 15.8497, 74.4977, 'district'),
('davangere',      'karnataka', 14.4644, 75.9218, 'district'),
('shivamogga',     'karnataka', 13.9299, 75.5681, 'district'),
('tumakuru',       'karnataka', 13.3379, 77.1173, 'district'),
('kalaburagi',     'karnataka', 17.3297, 76.8343, 'district'),
('gulbarga',       'karnataka', 17.3297, 76.8343, 'district'),
('ballari',        'karnataka', 15.1394, 76.9214, 'district'),
('bellary',        'karnataka', 15.1394, 76.9214, 'district'),
('vijayapura',     'karnataka', 16.8302, 75.7100, 'district'),
('bijapur',        'karnataka', 16.8302, 75.7100, 'district'),
('raichur',        'karnataka', 16.2120, 77.3439, 'district'),
('koppal',         'karnataka', 15.3530, 76.1547, 'district'),
('gadag',          'karnataka', 15.4164, 75.6267, 'district'),
('dharwad',        'karnataka', 15.4589, 75.0078, 'district'),
('uttara kannada', 'karnataka', 14.7970, 74.6900, 'district'),
('udupi',          'karnataka', 13.3409, 74.7421, 'district'),
('dakshina kannada','karnataka',12.8438, 75.2479, 'district'),
('chikkamagaluru', 'karnataka', 13.3153, 75.7754, 'district'),
('hassan',         'karnataka', 13.0069, 76.1004, 'district'),
('kodagu',         'karnataka', 12.3375, 75.8069, 'district'),
('mandya',         'karnataka', 12.5218, 76.8951, 'district'),
('chamrajnagar',   'karnataka', 11.9241, 76.9434, 'district'),
('chikkaballapur', 'karnataka', 13.4355, 77.7315, 'district'),
('kolar',          'karnataka', 13.1362, 78.1294, 'district'),
('ramanagara',     'karnataka', 12.7204, 77.2820, 'district'),
('bagalkot',       'karnataka', 16.1862, 75.6966, 'district'),
('yadgir',         'karnataka', 16.7690, 77.1390, 'district')
ON CONFLICT DO NOTHING;

-- Kerala
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('thiruvananthapuram', 'kerala', 8.5241, 76.9366, 'district'),
('trivandrum',     'kerala', 8.5241, 76.9366, 'district'),
('kochi',          'kerala', 9.9312, 76.2673, 'district'),
('ernakulam',      'kerala', 9.9312, 76.2673, 'district'),
('kozhikode',      'kerala', 11.2588, 75.7804, 'district'),
('calicut',        'kerala', 11.2588, 75.7804, 'district'),
('thrissur',       'kerala', 10.5276, 76.2144, 'district'),
('kollam',         'kerala', 8.8932, 76.6141, 'district'),
('palakkad',       'kerala', 10.7867, 76.6548, 'district'),
('malappuram',     'kerala', 11.0510, 76.0711, 'district'),
('kottayam',       'kerala', 9.5916, 76.5222, 'district'),
('alappuzha',      'kerala', 9.4981, 76.3388, 'district'),
('alleppey',       'kerala', 9.4981, 76.3388, 'district'),
('kannur',         'kerala', 11.8745, 75.3704, 'district'),
('pathanamthitta', 'kerala', 9.2648, 76.7870, 'district'),
('idukki',         'kerala', 9.9189, 77.1025, 'district'),
('wayanad',        'kerala', 11.6854, 76.1320, 'district'),
('kasaragod',      'kerala', 12.4996, 74.9869, 'district')
ON CONFLICT DO NOTHING;

-- Madhya Pradesh
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('bhopal',         'madhya pradesh', 23.2599, 77.4126, 'district'),
('indore',         'madhya pradesh', 22.7196, 75.8577, 'district'),
('jabalpur',       'madhya pradesh', 23.1815, 79.9864, 'district'),
('gwalior',        'madhya pradesh', 26.2183, 78.1828, 'district'),
('ujjain',         'madhya pradesh', 23.1793, 75.7849, 'district'),
('sagar',          'madhya pradesh', 23.8388, 78.7378, 'district'),
('satna',          'madhya pradesh', 24.5762, 80.8322, 'district'),
('rewa',           'madhya pradesh', 24.5362, 81.3037, 'district'),
('hoshangabad',    'madhya pradesh', 22.7500, 77.7300, 'district'),
('narmadapuram',   'madhya pradesh', 22.7500, 77.7300, 'district'),
('chhindwara',     'madhya pradesh', 22.0574, 78.9382, 'district'),
('ratlam',         'madhya pradesh', 23.3315, 75.0367, 'district'),
('dewas',          'madhya pradesh', 22.9676, 76.0534, 'district'),
('mandsaur',       'madhya pradesh', 24.0726, 75.0694, 'district'),
('neemuch',        'madhya pradesh', 24.4670, 74.8670, 'district'),
('vidisha',        'madhya pradesh', 23.5251, 77.8060, 'district'),
('raisen',         'madhya pradesh', 23.3280, 77.7882, 'district'),
('katni',          'madhya pradesh', 23.8342, 80.3967, 'district'),
('narsinghpur',    'madhya pradesh', 22.9476, 79.1913, 'district'),
('seoni',          'madhya pradesh', 22.0858, 79.5396, 'district'),
('mandla',         'madhya pradesh', 22.5994, 80.3727, 'district'),
('balaghat',       'madhya pradesh', 21.8135, 80.1860, 'district'),
('dindori',        'madhya pradesh', 22.9400, 81.0800, 'district'),
('betul',          'madhya pradesh', 21.9065, 77.9038, 'district'),
('harda',          'madhya pradesh', 22.3376, 77.0891, 'district'),
('khandwa',        'madhya pradesh', 21.8274, 76.3529, 'district'),
('burhanpur',      'madhya pradesh', 21.3102, 76.2299, 'district'),
('khargone',       'madhya pradesh', 21.8232, 75.6124, 'district'),
('barwani',        'madhya pradesh', 22.0368, 74.9003, 'district'),
('jhabua',         'madhya pradesh', 22.7677, 74.5940, 'district'),
('dhar',           'madhya pradesh', 22.5999, 75.2963, 'district'),
('shajapur',       'madhya pradesh', 23.4282, 76.2772, 'district'),
('agar malwa',     'madhya pradesh', 23.7129, 76.0121, 'district'),
('rajgarh',        'madhya pradesh', 23.8376, 76.7297, 'district'),
('guna',           'madhya pradesh', 24.6475, 77.3087, 'district'),
('ashoknagar',     'madhya pradesh', 24.5791, 77.7298, 'district'),
('shivpuri',       'madhya pradesh', 25.4237, 77.6580, 'district'),
('datia',          'madhya pradesh', 25.6659, 78.4592, 'district'),
('tikamgarh',      'madhya pradesh', 24.7440, 78.8296, 'district'),
('chhatarpur',     'madhya pradesh', 24.9173, 79.5941, 'district'),
('panna',          'madhya pradesh', 24.7178, 80.1849, 'district'),
('damoh',          'madhya pradesh', 23.8327, 79.4408, 'district'),
('umaria',         'madhya pradesh', 23.5218, 80.8395, 'district'),
('shahdol',        'madhya pradesh', 23.2960, 81.3558, 'district'),
('anuppur',        'madhya pradesh', 23.1018, 81.6914, 'district'),
('sidhi',          'madhya pradesh', 24.4152, 81.8761, 'district'),
('singrauli',      'madhya pradesh', 24.1997, 82.6738, 'district'),
('morena',         'madhya pradesh', 26.5025, 77.9984, 'district'),
('bhind',          'madhya pradesh', 26.5690, 78.7886, 'district'),
('sheopur',        'madhya pradesh', 25.6612, 76.6933, 'district')
ON CONFLICT DO NOTHING;

-- Maharashtra
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('mumbai',         'maharashtra', 19.0760, 72.8777, 'district'),
('pune',           'maharashtra', 18.5204, 73.8567, 'district'),
('nagpur',         'maharashtra', 21.1458, 79.0882, 'district'),
('nashik',         'maharashtra', 19.9975, 73.7898, 'district'),
('aurangabad',     'maharashtra', 19.8762, 75.3433, 'district'),
('chhatrapati sambhajinagar', 'maharashtra', 19.8762, 75.3433, 'district'),
('solapur',        'maharashtra', 17.6805, 75.9064, 'district'),
('thane',          'maharashtra', 19.2183, 72.9781, 'district'),
('kolhapur',       'maharashtra', 16.7050, 74.2433, 'district'),
('amravati',       'maharashtra', 20.9374, 77.7796, 'district'),
('latur',          'maharashtra', 18.4088, 76.5604, 'district'),
('nanded',         'maharashtra', 19.1383, 77.3210, 'district'),
('jalgaon',        'maharashtra', 21.0077, 75.5626, 'district'),
('akola',          'maharashtra', 20.7096, 77.0023, 'district'),
('washim',         'maharashtra', 20.1117, 77.1472, 'district'),
('yavatmal',       'maharashtra', 20.3888, 78.1204, 'district'),
('buldhana',       'maharashtra', 20.5292, 76.1842, 'district'),
('wardha',         'maharashtra', 20.7453, 78.5996, 'district'),
('chandrapur',     'maharashtra', 19.9615, 79.2961, 'district'),
('gadchiroli',     'maharashtra', 19.6000, 80.1700, 'district'),
('bhandara',       'maharashtra', 21.1667, 79.6500, 'district'),
('gondia',         'maharashtra', 21.4600, 80.1900, 'district'),
('dhule',          'maharashtra', 20.9042, 74.7749, 'district'),
('nandurbar',      'maharashtra', 21.3654, 74.2426, 'district'),
('ahmednagar',     'maharashtra', 19.0952, 74.7496, 'district'),
('bid',            'maharashtra', 18.9876, 75.7600, 'district'),
('osmanabad',      'maharashtra', 18.1860, 76.0400, 'district'),
('dharashiv',      'maharashtra', 18.1860, 76.0400, 'district'),
('hingoli',        'maharashtra', 19.7195, 77.1499, 'district'),
('parbhani',       'maharashtra', 19.2704, 76.7748, 'district'),
('jalna',          'maharashtra', 19.8347, 75.8816, 'district'),
('satara',         'maharashtra', 17.6805, 74.0183, 'district'),
('sangli',         'maharashtra', 16.8524, 74.5815, 'district'),
('ratnagiri',      'maharashtra', 16.9902, 73.3120, 'district'),
('sindhudurg',     'maharashtra', 16.3490, 73.7390, 'district'),
('raigad',         'maharashtra', 18.5164, 73.1806, 'district'),
('palghar',        'maharashtra', 19.6969, 72.7653, 'district')
ON CONFLICT DO NOTHING;

-- Odisha
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('bhubaneswar',    'odisha', 20.2961, 85.8245, 'district'),
('khordha',        'odisha', 20.1744, 85.6050, 'district'),
('cuttack',        'odisha', 20.4625, 85.8830, 'district'),
('berhampur',      'odisha', 19.3150, 84.7941, 'district'),
('ganjam',         'odisha', 19.3877, 84.7977, 'district'),
('sambalpur',      'odisha', 21.4669, 83.9756, 'district'),
('rourkela',       'odisha', 22.2604, 84.8536, 'district'),
('sundargarh',     'odisha', 22.1174, 84.0302, 'district'),
('puri',           'odisha', 19.8135, 85.8312, 'district'),
('balasore',       'odisha', 21.4942, 86.9340, 'district'),
('bhadrak',        'odisha', 21.0544, 86.4993, 'district'),
('kendrapara',     'odisha', 20.4967, 86.4236, 'district'),
('jagatsinghpur',  'odisha', 20.2566, 86.1711, 'district'),
('jajpur',         'odisha', 20.8450, 86.3350, 'district'),
('dhenkanal',      'odisha', 20.6596, 85.5981, 'district'),
('angul',          'odisha', 20.8404, 85.1012, 'district'),
('keonjhar',       'odisha', 21.6287, 85.5814, 'district'),
('mayurbhanj',     'odisha', 21.9415, 86.2907, 'district'),
('rayagada',       'odisha', 19.1651, 83.4167, 'district'),
('koraput',        'odisha', 18.8127, 82.7176, 'district'),
('malkangiri',     'odisha', 18.3540, 81.8846, 'district'),
('nabarangpur',    'odisha', 19.2335, 82.5386, 'district'),
('kalahandi',      'odisha', 19.9100, 83.1700, 'district'),
('nuapada',        'odisha', 20.8000, 82.5400, 'district'),
('bargarh',        'odisha', 21.3355, 83.6195, 'district'),
('jharsuguda',     'odisha', 21.8522, 84.0066, 'district'),
('deogarh',        'odisha', 21.5333, 84.7333, 'district'),
('sonepur',        'odisha', 20.8332, 83.9138, 'district'),
('bolangir',       'odisha', 20.7035, 83.4873, 'district'),
('boudh',          'odisha', 20.8457, 84.3248, 'district'),
('kandhamal',      'odisha', 20.4649, 84.2318, 'district'),
('nayagarh',       'odisha', 20.1259, 85.0956, 'district')
ON CONFLICT DO NOTHING;

-- Punjab
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('ludhiana',       'punjab', 30.9010, 75.8573, 'district'),
('amritsar',       'punjab', 31.6340, 74.8723, 'district'),
('jalandhar',      'punjab', 31.3260, 75.5762, 'district'),
('patiala',        'punjab', 30.3398, 76.3869, 'district'),
('bathinda',       'punjab', 30.2110, 74.9455, 'district'),
('mohali',         'punjab', 30.7046, 76.7179, 'district'),
('ferozepur',      'punjab', 30.9354, 74.6221, 'district'),
('gurdaspur',      'punjab', 32.0390, 75.4065, 'district'),
('hoshiarpur',     'punjab', 31.5143, 75.9110, 'district'),
('pathankot',      'punjab', 32.2643, 75.6522, 'district'),
('moga',           'punjab', 30.8183, 75.1699, 'district'),
('faridkot',       'punjab', 30.6740, 74.7601, 'district'),
('muktsar',        'punjab', 30.4771, 74.5159, 'district'),
('barnala',        'punjab', 30.3784, 75.5479, 'district'),
('mansa',          'punjab', 29.9885, 75.3854, 'district'),
('sangrur',        'punjab', 30.2447, 75.8440, 'district'),
('fatehgarh sahib','punjab', 30.6454, 76.3894, 'district'),
('rupnagar',       'punjab', 30.9739, 76.5247, 'district'),
('nawanshahr',     'punjab', 31.1249, 76.1154, 'district'),
('kapurthala',     'punjab', 31.3782, 75.3813, 'district')
ON CONFLICT DO NOTHING;

-- Rajasthan
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('jaipur',         'rajasthan', 26.9124, 75.7873, 'district'),
('jodhpur',        'rajasthan', 26.2389, 73.0243, 'district'),
('udaipur',        'rajasthan', 24.5854, 73.7125, 'district'),
('kota',           'rajasthan', 25.2138, 75.8648, 'district'),
('bikaner',        'rajasthan', 28.0229, 73.3119, 'district'),
('ajmer',          'rajasthan', 26.4499, 74.6399, 'district'),
('alwar',          'rajasthan', 27.5530, 76.6346, 'district'),
('sikar',          'rajasthan', 27.6146, 75.1398, 'district'),
('barmer',         'rajasthan', 25.7463, 71.3956, 'district'),
('jaisalmer',      'rajasthan', 26.9157, 70.9083, 'district'),
('sriganganagar',  'rajasthan', 29.9086, 73.8775, 'district'),
('hanumangarh',    'rajasthan', 29.5808, 74.3318, 'district'),
('churu',          'rajasthan', 28.2981, 74.9680, 'district'),
('jhunjhunu',      'rajasthan', 28.1275, 75.4000, 'district'),
('nagaur',         'rajasthan', 27.2029, 73.7336, 'district'),
('pali',           'rajasthan', 25.7711, 73.3234, 'district'),
('jalore',         'rajasthan', 25.3468, 72.6145, 'district'),
('sirohi',         'rajasthan', 24.8859, 72.8629, 'district'),
('bhilwara',       'rajasthan', 25.3478, 74.6313, 'district'),
('rajsamand',      'rajasthan', 25.0700, 73.8800, 'district'),
('chittorgarh',    'rajasthan', 24.8887, 74.6269, 'district'),
('dungarpur',      'rajasthan', 23.8430, 73.7140, 'district'),
('banswara',       'rajasthan', 23.5466, 74.4405, 'district'),
('pratapgarh',     'rajasthan', 24.0291, 74.7789, 'district'),
('baran',          'rajasthan', 25.1030, 76.5180, 'district'),
('bundi',          'rajasthan', 25.4380, 75.6407, 'district'),
('sawai madhopur', 'rajasthan', 26.0213, 76.3558, 'district'),
('tonk',           'rajasthan', 26.1686, 75.7910, 'district'),
('dausa',          'rajasthan', 26.8917, 76.3319, 'district'),
('bharatpur',      'rajasthan', 27.2152, 77.4892, 'district'),
('dholpur',        'rajasthan', 26.6996, 77.8939, 'district'),
('karauli',        'rajasthan', 26.5030, 77.0210, 'district'),
('jhalawar',       'rajasthan', 24.5960, 76.1660, 'district')
ON CONFLICT DO NOTHING;

-- Tamil Nadu
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('chennai',        'tamil nadu', 13.0827, 80.2707, 'district'),
('coimbatore',     'tamil nadu', 11.0168, 76.9558, 'district'),
('madurai',        'tamil nadu', 9.9252, 78.1198, 'district'),
('tiruchirappalli','tamil nadu', 10.7905, 78.7047, 'district'),
('trichy',         'tamil nadu', 10.7905, 78.7047, 'district'),
('salem',          'tamil nadu', 11.6643, 78.1460, 'district'),
('tirunelveli',    'tamil nadu', 8.7139, 77.7567, 'district'),
('vellore',        'tamil nadu', 12.9165, 79.1325, 'district'),
('thoothukudi',    'tamil nadu', 8.7642, 78.1348, 'district'),
('tuticorin',      'tamil nadu', 8.7642, 78.1348, 'district'),
('erode',          'tamil nadu', 11.3410, 77.7172, 'district'),
('dindigul',       'tamil nadu', 10.3624, 77.9695, 'district'),
('thanjavur',      'tamil nadu', 10.7870, 79.1378, 'district'),
('tirupur',        'tamil nadu', 11.1085, 77.3411, 'district'),
('karur',          'tamil nadu', 10.9601, 78.0766, 'district'),
('namakkal',       'tamil nadu', 11.2183, 78.1668, 'district'),
('cuddalore',      'tamil nadu', 11.7480, 79.7714, 'district'),
('villupuram',     'tamil nadu', 11.9401, 79.4861, 'district'),
('nagapattinam',   'tamil nadu', 10.7672, 79.8449, 'district'),
('tiruvarur',      'tamil nadu', 10.7727, 79.6378, 'district'),
('pudukkottai',    'tamil nadu', 10.3785, 78.8214, 'district'),
('sivaganga',      'tamil nadu', 9.8483, 78.4825, 'district'),
('virudhunagar',   'tamil nadu', 9.5860, 77.9624, 'district'),
('ramanathapuram', 'tamil nadu', 9.3639, 78.8395, 'district'),
('tenkasi',        'tamil nadu', 8.9597, 77.3154, 'district'),
('krishnagiri',    'tamil nadu', 12.5266, 78.2132, 'district'),
('dharmapuri',     'tamil nadu', 12.1277, 78.1583, 'district'),
('perambalur',     'tamil nadu', 11.2338, 78.8786, 'district'),
('ariyalur',       'tamil nadu', 11.1415, 79.0760, 'district'),
('kancheepuram',   'tamil nadu', 12.8185, 79.7006, 'district'),
('tiruvallur',     'tamil nadu', 13.1436, 79.9072, 'district'),
('chengalpattu',   'tamil nadu', 12.6921, 79.9753, 'district'),
('ranipet',        'tamil nadu', 12.9297, 79.3325, 'district'),
('tirupattur',     'tamil nadu', 12.4936, 78.5667, 'district'),
('the nilgiris',   'tamil nadu', 11.4916, 76.7337, 'district'),
('kallakurichi',   'tamil nadu', 11.7381, 78.9597, 'district')
ON CONFLICT DO NOTHING;

-- Telangana
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('hyderabad',      'telangana', 17.3850, 78.4867, 'district'),
('warangal',       'telangana', 17.9689, 79.5941, 'district'),
('nizamabad',      'telangana', 18.6725, 78.0941, 'district'),
('karimnagar',     'telangana', 18.4386, 79.1288, 'district'),
('khammam',        'telangana', 17.2473, 80.1514, 'district'),
('nalgonda',       'telangana', 17.0575, 79.2674, 'district'),
('mahbubnagar',    'telangana', 16.7370, 77.9800, 'district'),
('adilabad',       'telangana', 19.6640, 78.5320, 'district'),
('medak',          'telangana', 18.0452, 78.2625, 'district'),
('ranga reddy',    'telangana', 17.3683, 78.4011, 'district'),
('sangareddy',     'telangana', 17.6234, 78.0869, 'district'),
('siddipet',       'telangana', 18.1018, 78.8520, 'district'),
('jangaon',        'telangana', 17.7250, 79.1520, 'district'),
('jayashankar',    'telangana', 18.4667, 80.0167, 'district'),
('kumuram bheem',  'telangana', 19.3000, 79.6000, 'district'),
('mancherial',     'telangana', 18.8702, 79.4467, 'district'),
('nirmal',         'telangana', 19.1003, 78.3426, 'district'),
('vikarabad',      'telangana', 17.3379, 77.9041, 'district'),
('wanaparthy',     'telangana', 16.3624, 77.9049, 'district'),
('bhadradri kothagudem', 'telangana', 17.5541, 80.6166, 'district'),
('peddapalli',     'telangana', 18.6152, 79.3722, 'district'),
('rajanna sircilla','telangana', 18.3864, 78.8274, 'district'),
('yadadri bhuvanagiri', 'telangana', 17.5965, 78.9947, 'district'),
('suryapet',       'telangana', 17.1393, 79.6236, 'district'),
('mahabubabad',    'telangana', 17.5985, 80.0039, 'district'),
('mulugu',         'telangana', 18.1968, 80.0552, 'district'),
('narayanpet',     'telangana', 16.7430, 77.4921, 'district'),
('nagarkurnool',   'telangana', 16.4841, 78.3248, 'district')
ON CONFLICT DO NOTHING;

-- Uttar Pradesh
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('lucknow',        'uttar pradesh', 26.8467, 80.9462, 'district'),
('kanpur',         'uttar pradesh', 26.4499, 80.3319, 'district'),
('agra',           'uttar pradesh', 27.1767, 78.0081, 'district'),
('varanasi',       'uttar pradesh', 25.3176, 82.9739, 'district'),
('allahabad',      'uttar pradesh', 25.4358, 81.8463, 'district'),
('prayagraj',      'uttar pradesh', 25.4358, 81.8463, 'district'),
('ghaziabad',      'uttar pradesh', 28.6692, 77.4538, 'district'),
('meerut',         'uttar pradesh', 28.9845, 77.7064, 'district'),
('noida',          'uttar pradesh', 28.5355, 77.3910, 'district'),
('gautam buddha nagar', 'uttar pradesh', 28.5355, 77.3910, 'district'),
('bareilly',       'uttar pradesh', 28.3670, 79.4304, 'district'),
('moradabad',      'uttar pradesh', 28.8386, 78.7733, 'district'),
('aligarh',        'uttar pradesh', 27.8974, 78.0880, 'district'),
('gorakhpur',      'uttar pradesh', 26.7606, 83.3732, 'district'),
('mathura',        'uttar pradesh', 27.4924, 77.6737, 'district'),
('muzaffarnagar',  'uttar pradesh', 29.4711, 77.7047, 'district'),
('saharanpur',     'uttar pradesh', 29.9680, 77.5510, 'district'),
('rampur',         'uttar pradesh', 28.7986, 79.0124, 'district'),
('firozabad',      'uttar pradesh', 27.1591, 78.3957, 'district'),
('jhansi',         'uttar pradesh', 25.4484, 78.5685, 'district'),
('lakhimpur',      'uttar pradesh', 27.9455, 80.7825, 'district'),
('sitapur',        'uttar pradesh', 27.5635, 80.6834, 'district'),
('hardoi',         'uttar pradesh', 27.3953, 80.1318, 'district'),
('unnao',          'uttar pradesh', 26.5479, 80.4885, 'district'),
('rae bareli',     'uttar pradesh', 26.2343, 81.2285, 'district'),
('sultanpur',      'uttar pradesh', 26.2639, 82.0721, 'district'),
('faizabad',       'uttar pradesh', 26.7750, 82.1450, 'district'),
('ayodhya',        'uttar pradesh', 26.7922, 82.1998, 'district'),
('ambedkar nagar', 'uttar pradesh', 26.4500, 82.6800, 'district'),
('gonda',          'uttar pradesh', 27.1316, 81.9609, 'district'),
('balrampur',      'uttar pradesh', 27.4328, 82.1773, 'district'),
('bahraich',       'uttar pradesh', 27.5745, 81.5996, 'district'),
('shrawasti',      'uttar pradesh', 27.6500, 81.8500, 'district'),
('basti',          'uttar pradesh', 26.7947, 82.7283, 'district'),
('sant kabir nagar','uttar pradesh',26.7800, 83.0500, 'district'),
('siddharthnagar', 'uttar pradesh', 27.2953, 83.0606, 'district'),
('maharajganj',    'uttar pradesh', 27.1271, 83.5576, 'district'),
('kushinagar',     'uttar pradesh', 26.7404, 83.8879, 'district'),
('deoria',         'uttar pradesh', 26.5024, 83.7837, 'district'),
('mau',            'uttar pradesh', 25.9401, 83.5581, 'district'),
('azamgarh',       'uttar pradesh', 26.0690, 83.1837, 'district'),
('ballia',         'uttar pradesh', 25.7580, 84.1476, 'district'),
('ghazipur',       'uttar pradesh', 25.5849, 83.5730, 'district'),
('jaunpur',        'uttar pradesh', 25.7316, 82.6844, 'district'),
('chandauli',      'uttar pradesh', 25.2769, 83.2651, 'district'),
('bhadohi',        'uttar pradesh', 25.3893, 82.5695, 'district'),
('mirzapur',       'uttar pradesh', 25.1432, 82.5694, 'district'),
('sonbhadra',      'uttar pradesh', 24.6897, 83.0654, 'district'),
('chitrakoot',     'uttar pradesh', 25.2007, 80.8980, 'district'),
('banda',          'uttar pradesh', 25.4753, 80.3383, 'district'),
('hamirpur',       'uttar pradesh', 25.9493, 80.1462, 'district'),
('mahoba',         'uttar pradesh', 25.2912, 79.8728, 'district'),
('lalitpur',       'uttar pradesh', 24.6891, 78.4159, 'district'),
('kanpur dehat',   'uttar pradesh', 26.4140, 79.7970, 'district'),
('kannauj',        'uttar pradesh', 27.0548, 79.9178, 'district'),
('auraiya',        'uttar pradesh', 26.4643, 79.5110, 'district'),
('etawah',         'uttar pradesh', 26.7747, 79.0254, 'district'),
('mainpuri',       'uttar pradesh', 27.2305, 79.0211, 'district'),
('farrukhabad',    'uttar pradesh', 27.3931, 79.5817, 'district'),
('etah',           'uttar pradesh', 27.6580, 78.6700, 'district'),
('hathras',        'uttar pradesh', 27.5938, 78.0523, 'district'),
('kasganj',        'uttar pradesh', 27.8084, 78.6412, 'district'),
('pilibhit',       'uttar pradesh', 28.6313, 79.8042, 'district'),
('shahjahanpur',   'uttar pradesh', 27.8817, 79.9050, 'district'),
('budaun',         'uttar pradesh', 28.0339, 79.1248, 'district'),
('bijnor',         'uttar pradesh', 29.3716, 78.1358, 'district'),
('amroha',         'uttar pradesh', 28.9035, 78.4680, 'district'),
('hapur',          'uttar pradesh', 28.7304, 77.7758, 'district'),
('bagpat',         'uttar pradesh', 28.9447, 77.2125, 'district'),
('baghpat',        'uttar pradesh', 28.9447, 77.2125, 'district'),
('bulandshahr',    'uttar pradesh', 28.4069, 77.8499, 'district'),
('barabanki',      'uttar pradesh', 26.9261, 81.1840, 'district'),
('shyamnagar',     'uttar pradesh', 26.8000, 81.6000, 'district')
ON CONFLICT DO NOTHING;

-- Uttarakhand
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('dehradun',       'uttarakhand', 30.3165, 78.0322, 'district'),
('haridwar',       'uttarakhand', 29.9457, 78.1642, 'district'),
('nainital',       'uttarakhand', 29.3803, 79.4636, 'district'),
('almora',         'uttarakhand', 29.5968, 79.6591, 'district'),
('pithoragarh',    'uttarakhand', 29.5829, 80.2151, 'district'),
('udham singh nagar','uttarakhand',28.9924, 79.3947, 'district'),
('pauri garhwal',  'uttarakhand', 30.1518, 78.7791, 'district'),
('tehri garhwal',  'uttarakhand', 30.3781, 78.4322, 'district'),
('chamoli',        'uttarakhand', 30.4011, 79.3175, 'district'),
('uttarkashi',     'uttarakhand', 30.7268, 78.4354, 'district'),
('rudraprayag',    'uttarakhand', 30.2844, 78.9802, 'district'),
('bageshwar',      'uttarakhand', 29.8380, 79.7742, 'district'),
('champawat',      'uttarakhand', 29.3328, 80.0908, 'district')
ON CONFLICT DO NOTHING;

-- West Bengal
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('kolkata',        'west bengal', 22.5726, 88.3639, 'district'),
('howrah',         'west bengal', 22.5958, 88.2636, 'district'),
('north 24 parganas','west bengal',22.8593, 88.3939, 'district'),
('south 24 parganas','west bengal',22.1500, 88.2800, 'district'),
('hooghly',        'west bengal', 22.9000, 88.0000, 'district'),
('burdwan',        'west bengal', 23.2324, 87.8615, 'district'),
('purba bardhaman','west bengal', 23.2324, 87.8615, 'district'),
('paschim bardhaman','west bengal',23.5500, 87.0700, 'district'),
('nadia',          'west bengal', 23.4679, 88.5564, 'district'),
('murshidabad',    'west bengal', 24.1800, 88.2700, 'district'),
('birbhum',        'west bengal', 23.9092, 87.5295, 'district'),
('bankura',        'west bengal', 23.2324, 86.9786, 'district'),
('purulia',        'west bengal', 23.3323, 86.3614, 'district'),
('malda',          'west bengal', 25.0112, 88.1411, 'district'),
('south dinajpur', 'west bengal', 25.6200, 88.6400, 'district'),
('north dinajpur', 'west bengal', 26.1100, 88.3900, 'district'),
('jalpaiguri',     'west bengal', 26.5425, 88.7179, 'district'),
('darjeeling',     'west bengal', 27.0360, 88.2627, 'district'),
('alipurduar',     'west bengal', 26.4944, 89.5265, 'district'),
('cooch behar',    'west bengal', 26.3451, 89.4430, 'district'),
('east midnapore', 'west bengal', 22.1500, 87.6700, 'district'),
('west midnapore', 'west bengal', 22.4259, 87.3191, 'district'),
('jhargram',       'west bengal', 22.4490, 86.9963, 'district')
ON CONFLICT DO NOTHING;

-- Delhi
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('central delhi',  'delhi', 28.6508, 77.2373, 'district'),
('east delhi',     'delhi', 28.6600, 77.2900, 'district'),
('new delhi',      'delhi', 28.6139, 77.2090, 'district'),
('north delhi',    'delhi', 28.7300, 77.2100, 'district'),
('north east delhi','delhi', 28.6900, 77.3000, 'district'),
('north west delhi','delhi', 28.7200, 77.0900, 'district'),
('shahdara',       'delhi', 28.6700, 77.3000, 'district'),
('south delhi',    'delhi', 28.5300, 77.2500, 'district'),
('south east delhi','delhi', 28.5700, 77.3000, 'district'),
('south west delhi','delhi', 28.5600, 77.0600, 'district'),
('west delhi',     'delhi', 28.6500, 77.0900, 'district')
ON CONFLICT DO NOTHING;

-- Jammu and Kashmir
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('srinagar',       'jammu and kashmir', 34.0837, 74.7973, 'district'),
('jammu',          'jammu and kashmir', 32.7266, 74.8570, 'district'),
('anantnag',       'jammu and kashmir', 33.7310, 75.1521, 'district'),
('baramulla',      'jammu and kashmir', 34.2100, 74.3400, 'district'),
('budgam',         'jammu and kashmir', 33.9332, 74.7159, 'district'),
('kupwara',        'jammu and kashmir', 34.5212, 74.2567, 'district'),
('pulwama',        'jammu and kashmir', 33.8738, 74.8951, 'district'),
('shopian',        'jammu and kashmir', 33.7155, 74.8340, 'district'),
('kulgam',         'jammu and kashmir', 33.6442, 75.0191, 'district'),
('ganderbal',      'jammu and kashmir', 34.2285, 74.7730, 'district'),
('bandipora',      'jammu and kashmir', 34.4162, 74.6513, 'district'),
('udhampur',       'jammu and kashmir', 32.9156, 75.1360, 'district'),
('kathua',         'jammu and kashmir', 32.3838, 75.5132, 'district'),
('rajouri',        'jammu and kashmir', 33.3819, 74.3118, 'district'),
('poonch',         'jammu and kashmir', 33.7714, 74.0930, 'district'),
('doda',           'jammu and kashmir', 33.1491, 75.5463, 'district'),
('kishtwar',       'jammu and kashmir', 33.3144, 75.7695, 'district'),
('ramban',         'jammu and kashmir', 33.2437, 75.2384, 'district'),
('reasi',          'jammu and kashmir', 33.0800, 74.8300, 'district'),
('samba',          'jammu and kashmir', 32.5697, 75.1191, 'district')
ON CONFLICT DO NOTHING;

-- Ladakh
INSERT INTO india_locations (district, state, latitude, longitude, level) VALUES
('leh',            'ladakh', 34.1526, 77.5770, 'district'),
('kargil',         'ladakh', 34.5539, 76.1348, 'district')
ON CONFLICT DO NOTHING;
