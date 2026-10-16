-- =========================================================================
-- AGROSAFE TRAVEL — SEED DATA SCRIPT (SUPABASE POSTGRESQL)
-- 2 Hosts, 2 Guests, 24 Northern Hilly Farms, Warnings, Escrows
-- Default Password for all seed users: 'password123'
-- =========================================================================

-- 1. SEED USERS (2 Hosts, 2 Guests, 1 Admin)
-- bcrypt hash for 'password123' -> $2b$10$xew3HLg1glPa63JdvcV6r.J7sdE8Ii0jV1HjXGmSiaAx2uvfFujzq
INSERT INTO users (id, user_type, first_name, last_name, email, password_hash, phone_number, is_verified) VALUES
(1, 'host', 'Rohit', 'Bisht', 'rohit.bisht@example.com', '$2b$10$xew3HLg1glPa63JdvcV6r.J7sdE8Ii0jV1HjXGmSiaAx2uvfFujzq', '+91 98765 43210', true),
(2, 'host', 'Vikram', 'Singh', 'vikram.singh@example.com', '$2b$10$xew3HLg1glPa63JdvcV6r.J7sdE8Ii0jV1HjXGmSiaAx2uvfFujzq', '+91 98765 43211', true),
(3, 'guest', 'Arjun', 'Verma', 'arjun.verma@example.com', '$2b$10$xew3HLg1glPa63JdvcV6r.J7sdE8Ii0jV1HjXGmSiaAx2uvfFujzq', '+91 98765 43220', true),
(4, 'guest', 'Pooja', 'Sharma', 'pooja.sharma@example.com', '$2b$10$xew3HLg1glPa63JdvcV6r.J7sdE8Ii0jV1HjXGmSiaAx2uvfFujzq', '+91 98765 43221', true),
(5, 'admin', 'System', 'Admin', 'admin@example.com', '$2b$10$xew3HLg1glPa63JdvcV6r.J7sdE8Ii0jV1HjXGmSiaAx2uvfFujzq', '+91 98765 43200', true)
ON CONFLICT (id) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. SEED STATIC GEO REFERENCES
INSERT INTO static_geo_reference (id, state, district, subdistrict, center_latitude, center_longitude) VALUES
(1, 'Uttarakhand', 'Nainital', 'Ramgarh', 29.426000, 79.552000),
(2, 'Uttarakhand', 'Nainital', 'Mukteshwar', 29.472000, 79.647000),
(3, 'Uttarakhand', 'Nainital', 'Bhimtal', 29.351000, 79.554000),
(4, 'Uttarakhand', 'Chamoli', 'Joshimath', 30.556000, 79.563000),
(5, 'Uttarakhand', 'Chamoli', 'Gopeshwar', 30.418000, 79.333000),
(6, 'Uttarakhand', 'Chamoli', 'Karnaprayag', 30.261000, 79.219000),
(7, 'Uttarakhand', 'Almora', 'Ranikhet', 29.643000, 79.432000),
(8, 'Uttarakhand', 'Almora', 'Kausani', 29.854000, 79.597000),
(9, 'Uttarakhand', 'Tehri Garhwal', 'Kanatal', 30.416000, 78.337000),
(10, 'Uttarakhand', 'Dehradun', 'Chakrata', 30.701000, 77.869000),
(11, 'Uttarakhand', 'Pithoragarh', 'Munsiyari', 30.067000, 80.233000),
(12, 'Uttarakhand', 'Uttarkashi', 'Harsil', 31.034000, 78.738000),
(13, 'Himachal Pradesh', 'Mandi', 'Parashar', 31.754000, 77.101000),
(14, 'Himachal Pradesh', 'Mandi', 'Kamand', 31.781000, 76.992000),
(15, 'Himachal Pradesh', 'Mandi', 'Barot', 32.036000, 76.844000),
(16, 'Himachal Pradesh', 'Kullu', 'Naggar', 32.138000, 77.172000),
(17, 'Himachal Pradesh', 'Kullu', 'Jibhi', 31.637000, 77.348000),
(18, 'Himachal Pradesh', 'Kullu', 'Manali', 32.243000, 77.189000),
(19, 'Himachal Pradesh', 'Shimla', 'Mashobra', 31.127000, 77.234000),
(20, 'Himachal Pradesh', 'Shimla', 'Narkanda', 31.258000, 77.458000),
(21, 'Himachal Pradesh', 'Shimla', 'Kotgarh', 31.317000, 77.489000),
(22, 'Himachal Pradesh', 'Kinnaur', 'Sangla', 31.423000, 78.261000),
(23, 'Himachal Pradesh', 'Kinnaur', 'Kalpa', 31.538000, 78.256000),
(24, 'Himachal Pradesh', 'Kangra', 'Bir', 32.046000, 76.721000),
(25, 'Himachal Pradesh', 'Kangra', 'Dharamkot', 32.248000, 76.326000),
(26, 'Himachal Pradesh', 'Solan', 'Chail', 30.969000, 77.194000)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED MONTHLY SAFE MATRIX
INSERT INTO monthly_safe_matrix (state, district, year, month, safety_rating, rainfall_mm, soil_stability_index, historical_landslides_count) VALUES
('Uttarakhand', 'Nainital', 2026, 1, 'Safe', 35.0, 92.0, 0),
('Uttarakhand', 'Nainital', 2026, 2, 'Safe', 45.0, 90.0, 0),
('Uttarakhand', 'Nainital', 2026, 3, 'Safe', 28.0, 94.0, 0),
('Uttarakhand', 'Nainital', 2026, 4, 'Safe', 22.0, 95.0, 0),
('Uttarakhand', 'Nainital', 2026, 5, 'Safe', 60.0, 88.0, 1),
('Uttarakhand', 'Nainital', 2026, 6, 'Moderate', 190.0, 72.0, 3),
('Uttarakhand', 'Nainital', 2026, 7, 'High Risk', 380.0, 45.0, 9),
('Uttarakhand', 'Nainital', 2026, 8, 'High Risk', 410.0, 40.0, 12),
('Uttarakhand', 'Nainital', 2026, 9, 'Moderate', 160.0, 70.0, 4),
('Uttarakhand', 'Nainital', 2026, 10, 'Safe', 25.0, 91.0, 0),
('Uttarakhand', 'Nainital', 2026, 11, 'Safe', 12.0, 96.0, 0),
('Uttarakhand', 'Nainital', 2026, 12, 'Safe', 18.0, 95.0, 0),
('Uttarakhand', 'Chamoli', 2026, 1, 'Safe', 40.0, 89.0, 0),
('Uttarakhand', 'Chamoli', 2026, 2, 'Safe', 50.0, 87.0, 0),
('Uttarakhand', 'Chamoli', 2026, 3, 'Safe', 35.0, 91.0, 0),
('Uttarakhand', 'Chamoli', 2026, 4, 'Safe', 30.0, 93.0, 0),
('Uttarakhand', 'Chamoli', 2026, 5, 'Moderate', 75.0, 78.0, 2),
('Uttarakhand', 'Chamoli', 2026, 6, 'Moderate', 220.0, 68.0, 5),
('Uttarakhand', 'Chamoli', 2026, 7, 'High Risk', 460.0, 38.0, 16),
('Uttarakhand', 'Chamoli', 2026, 8, 'High Risk', 490.0, 34.0, 18),
('Uttarakhand', 'Chamoli', 2026, 9, 'Moderate', 180.0, 66.0, 6),
('Uttarakhand', 'Chamoli', 2026, 10, 'Safe', 30.0, 90.0, 1),
('Uttarakhand', 'Chamoli', 2026, 11, 'Safe', 15.0, 95.0, 0),
('Uttarakhand', 'Chamoli', 2026, 12, 'Safe', 20.0, 94.0, 0)
ON CONFLICT (state, district, year, month) DO UPDATE SET
  safety_rating = EXCLUDED.safety_rating,
  rainfall_mm = EXCLUDED.rainfall_mm,
  soil_stability_index = EXCLUDED.soil_stability_index;

-- 4. SEED FARMS (24 Northern Hilly Farms across Host 1 and Host 2)
INSERT INTO farms (id, slug, host_id, title, description, state, district, subdistrict, category, latitude, longitude, uses_fallback_coords, nightly_rate, images, amenities, cancellation_policy, emergency_contact, regional_guidelines) VALUES
(1, 'apple-blossom-retreat', 1, 'Apple Blossom Retreat', 'A working apple and apricot orchard on the Kumaon ridge. Guests join seasonal pruning, grafting, and harvest with panoramic views of the Nanda Devi range.', 'Uttarakhand', 'Nainital', 'Ramgarh', 'Himalayan Orchard', 29.426, 79.552, false, 4500.0, ARRAY['https://picsum.photos/seed/apple-orchard-1/900/600'], ARRAY['Organic Apple Orchard', 'Wi-Fi', 'Safety Monitoring', 'Kumaoni Meals'], 'Full refund 48 hours prior to check-in.', 'Caretaker Anand: +91 98765 11001', 'Follow marked orchard trails.'),
(2, 'oak-terrace-organic-farm', 1, 'Oak Terrace Organic Farm', 'Stone cottages set amidst terraced organic mustard and barley fields. High-altitude mountain views with morning farm milking and solar-powered amenities.', 'Uttarakhand', 'Nainital', 'Mukteshwar', 'Organic Farm', 29.472, 79.647, false, 4200.0, ARRAY['https://picsum.photos/seed/oak-terrace-2/900/600'], ARRAY['Milking Experience', 'Wi-Fi', 'Solar Powered'], 'Full refund 48 hours prior to check-in.', 'Host Rohit: +91 98765 43210', 'Keep cottage doors latched at night.'),
(3, 'bhimtal-valley-herb-farm', 1, 'Bhimtal Valley Herb Farm', 'Medicinal herb cultivation and lemon groves beside freshwater runoff canals. Hands-on chamomile tea harvesting and valley relaxation.', 'Uttarakhand', 'Nainital', 'Bhimtal', 'Permaculture Retreat', 29.351, 79.554, false, 3800.0, ARRAY['https://picsum.photos/seed/herb-farm-3/900/600'], ARRAY['Herb Processing', 'Wi-Fi', 'Farm Meals'], 'Standard 48hr cancellation.', 'Caretaker Prem: +91 98765 11002', 'Harvest herbs with supervision.'),
(4, 'joshimath-high-ridge-stay', 1, 'Joshimath High Ridge Stay', 'Upper Alaknanda terraced potato and walnut farmstead. Overlooks the gateway to Nanda Devi National Park with integrated slope telemetry.', 'Uttarakhand', 'Chamoli', 'Joshimath', 'Organic Farm', 30.556, 79.563, false, 3600.0, ARRAY['https://picsum.photos/seed/joshimath-ridge-4/900/600'], ARRAY['Walnut Picking', 'Safety Sensors', 'Garhwali Meals'], '100% automated refund on slope alerts.', 'Host Rohit: +91 98765 43210', 'Adhere to BRO road advisory.'),
(5, 'gopeshwar-pine-valley-homestead', 1, 'Gopeshwar Pine Valley Homestead', 'Nestled amidst thick pine and deodar forests, producing organic red rice, hill beans, and wild rhododendron juice.', 'Uttarakhand', 'Chamoli', 'Gopeshwar', 'Organic Farm', 30.418, 79.333, false, 3200.0, ARRAY['https://picsum.photos/seed/gopeshwar-farm-5/900/600'], ARRAY['Organic Farming', 'Wi-Fi', 'Local Cuisine'], 'Full 48hr flexible cancellation.', 'Caretaker Mohan: +91 98765 11003', 'No plastic disposal.'),
(6, 'alaknanda-confluence-farm', 1, 'Alaknanda Confluence Farm', 'Riverside citrus and ginger terraces near Karnaprayag confluence. Peaceful riverfront walks and river-cooled cottages.', 'Uttarakhand', 'Chamoli', 'Karnaprayag', 'Organic Farm', 30.261, 79.219, false, 3400.0, ARRAY['https://picsum.photos/seed/confluence-farm-6/900/600'], ARRAY['Citrus Harvesting', 'River Trail'], '100% refund guarantee under rain alerts.', 'Host Rohit: +91 98765 43210', 'Wear safety vest near river.'),
(7, 'ranikhet-cedar-estate', 1, 'Ranikhet Cedar Estate', 'Historic cedar-flanked plum and peach orchard. Guests experience traditional pit-composting, bee-keeping, and mountain sunset teas.', 'Uttarakhand', 'Almora', 'Ranikhet', 'Himalayan Orchard', 29.643, 79.432, false, 4800.0, ARRAY['https://picsum.photos/seed/ranikhet-estate-7/900/600'], ARRAY['Beekeeping', 'Wi-Fi', 'Organic Kitchen'], '48-hour free cancellation.', 'Caretaker Diwan: +91 98765 11004', 'Do not disturb apiary boxes.'),
(8, 'kausani-tea-terrace-retreat', 1, 'Kausani Tea Terrace Retreat', 'Miniature organic tea estate with unobstructed 300km Himalayan panoramas. Learn artisan hand-rolling of high-altitude green tea.', 'Uttarakhand', 'Almora', 'Kausani', 'Tea & Cardamom', 29.854, 79.597, false, 5100.0, ARRAY['https://picsum.photos/seed/kausani-tea-8/900/600'], ARRAY['Tea Tasting', 'Wi-Fi', 'Himalayan Views'], 'Full refund 48 hours prior.', 'Host Rohit: +91 98765 43210', 'Morning plucking at 7 AM.'),
(9, 'parashar-lake-dairy-farmstay', 1, 'Parashar Lake Dairy Farmstay', 'High-altitude pasture farm below the sacred Parashar ridge. Pure indigenous cow dairy farming, artisanal butter churning, and cedar log cabins.', 'Himachal Pradesh', 'Mandi', 'Parashar', 'Permaculture Retreat', 31.754, 77.101, false, 4600.0, ARRAY['https://picsum.photos/seed/parashar-dairy-9/900/600'], ARRAY['Dairy & Churning', 'Wi-Fi', 'Safety Sensors'], 'Weather-safe 100% refund.', 'Caretaker Hemraj: +91 98765 11005', 'High incline road — check alerts.'),
(10, 'kamand-valley-eco-ranch', 1, 'Kamand Valley Eco Ranch', 'Valley permaculture ranch near Uhl river tributaries. Hydro-cooled vegetable polyhouses and trout-pond sustainable aquaculture.', 'Himachal Pradesh', 'Mandi', 'Kamand', 'Permaculture Retreat', 31.781, 76.992, false, 3900.0, ARRAY['https://picsum.photos/seed/kamand-ranch-10/900/600'], ARRAY['Polyhouse Farming', 'IIT Telemetry Station'], 'Full 48hr flexible escrow protection.', 'Host Rohit: +91 98765 43210', 'Wear boots in polyhouses.'),
(11, 'barot-trout-and-herb-orchard', 1, 'Barot Trout & Herb Orchard', 'Lush valley farm with fresh water streamlets, kiwi vines, and terraced red kidney beans.', 'Himachal Pradesh', 'Mandi', 'Barot', 'Organic Farm', 32.036, 76.844, false, 3700.0, ARRAY['https://picsum.photos/seed/barot-farm-11/900/600'], ARRAY['Kiwi Orchard', 'Wi-Fi', 'Stream Trail'], 'Full refund up to 48 hours before check-in.', 'Caretaker Rakesh: +91 98765 11006', 'Check Uhl road after rain.'),
(12, 'kanatal-pine-permaculture', 1, 'Kanatal Pine Permaculture', 'Fog-kissed terraced farm cultivating rare Himalayan herbs and heirloom buckwheat at 8,500 feet altitude.', 'Uttarakhand', 'Tehri Garhwal', 'Kanatal', 'Permaculture Retreat', 30.416, 78.337, false, 4400.0, ARRAY['https://picsum.photos/seed/kanatal-farm-12/900/600'], ARRAY['Heirloom Grain', 'Bonfire Dinners'], '100% refund guarantee on road alerts.', 'Host Rohit: +91 98765 43210', 'High wind gusts in autumn.'),
(13, 'naggar-heritage-apple-estate', 2, 'Naggar Heritage Apple Estate', 'Century-old Kathkuni architectural estate surrounded by Royal Delicious apple trees overlooking the snowcapped Beas Valley.', 'Himachal Pradesh', 'Kullu', 'Naggar', 'Himalayan Orchard', 32.138, 77.172, false, 5500.0, ARRAY['https://picsum.photos/seed/naggar-estate-13/900/600'], ARRAY['Heritage Stay', 'Wi-Fi', 'Himachali Dham'], '48-hour flexible cancellation.', 'Host Vikram: +91 98765 43211', 'Wood carvings are heritage.'),
(14, 'jibhi-riverstone-cottages', 2, 'Jibhi Riverstone Cottages', 'Cedar wood river cottages with an organic trout pool, walnut drying courtyards, and direct forest trail access to Jalori Pass.', 'Himachal Pradesh', 'Kullu', 'Jibhi', 'Organic Farm', 31.637, 77.348, false, 4900.0, ARRAY['https://picsum.photos/seed/jibhi-cottages-14/900/600'], ARRAY['Walnut Processing', 'River Lounge'], '100% refund on Jalori Pass closures.', 'Host Vikram: +91 98765 43211', 'Check Jalori road in rains.'),
(15, 'old-manali-permaculture-sanctuary', 2, 'Old Manali Permaculture Sanctuary', 'Chemical-free permaculture sanctuary cultivating ancient amaranth, cannabis-hemp fiber, and heritage pear varieties.', 'Himachal Pradesh', 'Kullu', 'Manali', 'Permaculture Retreat', 32.243, 77.189, false, 4700.0, ARRAY['https://picsum.photos/seed/old-manali-15/900/600'], ARRAY['Permaculture Workshop', 'Vegan Farm Meals'], '48-hour free cancellation.', 'Caretaker Lalit: +91 98765 11007', 'Zero-waste property.'),
(16, 'mashobra-wildflower-orchard', 2, 'Mashobra Wildflower Orchard', 'High-ridge cherry and plum orchard bordered by Craignano oak forests. Morning bird-watching walks and apple cider press workshops.', 'Himachal Pradesh', 'Shimla', 'Mashobra', 'Himalayan Orchard', 31.127, 77.234, false, 5200.0, ARRAY['https://picsum.photos/seed/mashobra-orchard-16/900/600'], ARRAY['Cider Pressing', 'Forest Walks'], '48-hour flexible refund.', 'Host Vikram: +91 98765 43211', 'Keep fires in designated pits.'),
(17, 'narkanda-cherry-peak-homestead', 2, 'Narkanda Cherry Peak Homestead', 'Situated at 9,000 feet, specializing in dark sweet cherries and golden apples with sweeping views of the Hatu Peak range.', 'Himachal Pradesh', 'Shimla', 'Narkanda', 'Himalayan Orchard', 31.258, 77.458, false, 4300.0, ARRAY['https://picsum.photos/seed/narkanda-cherry-17/900/600'], ARRAY['Cherry Picking', 'Hatu Treks'], '100% refund on fog/frost alerts.', 'Caretaker Jagdish: +91 98765 11008', 'Dress warmly in evenings.'),
(18, 'kotgarh-apple-cradle-farm', 2, 'Kotgarh Apple Cradle Farm', 'The historical birthplace of Himalayan apples in India. Experience authentic colonial-era apple cellars, honey harvest, and orchard walks.', 'Himachal Pradesh', 'Shimla', 'Kotgarh', 'Himalayan Orchard', 31.317, 77.489, false, 4600.0, ARRAY['https://picsum.photos/seed/kotgarh-cradle-18/900/600'], ARRAY['Apple Cellar', 'Honey Harvest'], '48-hour standard cancellation.', 'Host Vikram: +91 98765 43211', 'Watch footing in cellars.'),
(19, 'sangla-valley-saffron-and-almond-estate', 2, 'Sangla Valley Saffron & Almond Estate', 'Baspa river terrace farm cultivating Kinnauri red apples, sweet almonds, and wild mountain saffron under the Kinner Kailash massif.', 'Himachal Pradesh', 'Kinnaur', 'Sangla', 'Organic Farm', 31.423, 78.261, false, 5800.0, ARRAY['https://picsum.photos/seed/sangla-almond-19/900/600'], ARRAY['Almond Shelling', 'Wood Stoves'], '100% automated refund on road alerts.', 'Caretaker Tenzin: +91 98765 11009', 'Check Hindustan-Tibet highway status.'),
(20, 'kalpa-pinnacle-orchards', 2, 'Kalpa Pinnacle Orchards', 'Perched over the deep Sutlej gorge facing the direct sunrise onto Jorkanden peak. Specializes in prized golden Kinnaur apples and sun-dried apricots.', 'Himachal Pradesh', 'Kinnaur', 'Kalpa', 'Himalayan Orchard', 31.538, 78.256, false, 5300.0, ARRAY['https://picsum.photos/seed/kalpa-orchard-20/900/600'], ARRAY['Apricot Drying', 'Sunrise Deck'], '100% refund on landslide alerts.', 'Host Vikram: +91 98765 43211', 'High altitude — stay hydrated.'),
(21, 'bir-tea-and-organic-terrace', 2, 'Bir Tea & Organic Terrace', 'Certified organic orthodox tea gardens beneath the paragliding landing meadows. Fresh strawberry patches, artisan baking, and mountain sunsets.', 'Himachal Pradesh', 'Kangra', 'Bir', 'Tea & Cardamom', 32.046, 76.721, false, 4100.0, ARRAY['https://picsum.photos/seed/bir-tea-21/900/600'], ARRAY['Tea Tasting', 'Organic Bakery'], '48-hour free cancellation.', 'Caretaker Sunil: +91 98765 11010', 'Respect tea bush rows.'),
(22, 'dharamkot-cedar-permaculture', 2, 'Dharamkot Cedar Permaculture', 'Dhauladhar mountain base farm cultivating organic microgreens, sourdough grain, and wild mint with meditation spots in cedar woods.', 'Himachal Pradesh', 'Kangra', 'Dharamkot', 'Permaculture Retreat', 32.248, 76.326, false, 3800.0, ARRAY['https://picsum.photos/seed/dharamkot-farm-22/900/600'], ARRAY['Microgreens', 'Yoga Space'], '48-hour flexible escrow protection.', 'Host Vikram: +91 98765 43211', 'No loud audio after 9 PM.'),
(23, 'chail-apple-and-rose-orchard', 2, 'Chail Apple & Rose Orchard', 'Secluded terrace gardens producing Damask rose water, crisp Golden Delicious apples, and wild forest honey in Solan hills.', 'Himachal Pradesh', 'Solan', 'Chail', 'Floral Fields', 30.969, 77.194, false, 4500.0, ARRAY['https://picsum.photos/seed/chail-orchard-23/900/600'], ARRAY['Rose Distillation', 'Outdoor Dinners'], '48-hour free cancellation.', 'Caretaker Ramesh: +91 98765 11011', 'Rose distillation at 6:30 AM.'),
(24, 'harsil-valley-apple-ranch', 2, 'Harsil Valley Apple Ranch', 'Bhagirathi river tributary farmstead renowned for Wilson apple varieties, dried beans, and cedar log cabins below Gangotri peaks.', 'Uttarakhand', 'Uttarkashi', 'Harsil', 'Himalayan Orchard', 31.034, 78.738, false, 5600.0, ARRAY['https://picsum.photos/seed/harsil-apple-24/900/600'], ARRAY['Wilson Apple Tour', 'Campfire'], '100% automated refund on highway alerts.', 'Host Vikram: +91 98765 43211', 'Check highway status before driving.')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  host_id = EXCLUDED.host_id,
  nightly_rate = EXCLUDED.nightly_rate,
  images = EXCLUDED.images,
  amenities = EXCLUDED.amenities;

SELECT setval('farms_id_seq', (SELECT MAX(id) FROM farms));

-- 5. SEED BOOKINGS (Matches Schema: stay_start_date, stay_end_date, total_guests, current_status)
INSERT INTO bookings (id, booking_code, guest_id, farm_id, stay_start_date, stay_end_date, total_guests, current_status) VALUES
(1, 'AGS-48213', 3, 1, '2026-09-15', '2026-09-18', 2, 'Confirmed'),
(2, 'AGS-47990', 4, 13, '2026-06-02', '2026-06-05', 2, 'Completed'),
(3, 'AGS-47612', 3, 4, '2026-08-10', '2026-08-13', 2, 'Cancelled'),
(4, 'AGS-49102', 4, 19, '2026-10-04', '2026-10-07', 3, 'Confirmed')
ON CONFLICT (id) DO UPDATE SET
  current_status = EXCLUDED.current_status;

SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));

-- 6. SEED LANDSLIDE REPORTS
INSERT INTO landslide_reports (id, report_code, uploaded_by_user_id, image_s3_url, latitude, longitude, location_name, details, report_time, cnn_confidence_score, processing_status, severity) VALUES
(1, 'UK-LS-0451', 3, 'https://picsum.photos/seed/landslide-joshimath/800/600', 30.556000, 79.563000, 'NH-7 near Joshimath, Chamoli', 'Mudflow debris on NH-7 approach slope', '2026-08-07 12:35:00+00', 0.88, 'Processed', 'High'),
(2, 'HP-LS-0077', 4, 'https://picsum.photos/seed/landslide-kinnaur/800/600', 31.423000, 78.261000, 'Sangla Valley Approach Road, Kinnaur', 'Minor loose gravel and rockfall near stream crossing', '2026-08-04 08:50:00+00', 0.72, 'Processed', 'Medium'),
(3, 'HP-LS-0105', 3, 'https://picsum.photos/seed/landslide-mandi/800/600', 31.754000, 77.101000, 'Parashar Ridge Incline Road, Mandi', 'Heavy rainfall mud saturation on hairpin turn', '2026-08-06 09:15:00+00', 0.91, 'Processed', 'High')
ON CONFLICT (id) DO NOTHING;

SELECT setval('landslide_reports_id_seq', (SELECT MAX(id) FROM landslide_reports));

-- 7. SEED WARNINGS
INSERT INTO warnings (id, warning_code, warning_source, report_id, farm_id, host_id, title, description, severity, epicenter_lat, epicenter_lng, impact_radius_km, issued_at, expires_at, status) VALUES
(1, 'WRN-2026-UK09', 'Automated_CNN', 1, 4, null, 'NH-7 Joshimath Sector Debris Flow', 'Automated verification identified mudslide debris across Chamoli valley approach road. Precautionary travel advisory dispatched.', 'High', 30.556, 79.563, 15.0, '2026-08-07 12:40:00+00', '2026-08-14 12:40:00+00', 'Active'),
(2, 'WRN-2026-HP03', 'Manual_Host', 3, 9, 1, 'Heavy Downpour Incline Saturation Advisory', 'Host manual warning issued for Parashar hill slope due to continuous rain. Escrow 100% refund safeguard activated.', 'High', 31.754, 77.101, 10.0, '2026-08-06 09:30:00+00', '2026-08-12 09:30:00+00', 'Active'),
(3, 'WRN-2026-HP02', 'Automated_CNN', 2, 19, null, 'Loose Gravel on Sangla Gateway Road', 'Debris cleared by mountain highway maintenance teams. Route normalized for farmstay guests.', 'Low', 31.423, 78.261, 8.0, '2026-08-04 08:55:00+00', '2026-08-06 08:55:00+00', 'Expired')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

SELECT setval('warnings_id_seq', (SELECT MAX(id) FROM warnings));

-- 8. SEED PAYMENTS
INSERT INTO payments (id, payment_code, booking_id, stay_amount, platform_fee, total_charged, escrow_status, gateway_ref) VALUES
(1, 'PAY-88213', 1, 13500.0, 450.0, 13950.0, 'Held_In_Escrow', 'rzp_live_984128941'),
(2, 'PAY-87990', 2, 16500.0, 450.0, 16950.0, 'Released_To_Host', 'rzp_live_871239011'),
(3, 'PAY-87612', 3, 10800.0, 450.0, 11250.0, 'Refunded_To_Guest', 'rzp_live_761298412'),
(4, 'PAY-89102', 4, 17400.0, 450.0, 17850.0, 'Held_In_Escrow', 'rzp_live_891023441')
ON CONFLICT (id) DO UPDATE SET
  escrow_status = EXCLUDED.escrow_status;

SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));

-- 9. SEED PAYMENT TRANSACTION LOGS
INSERT INTO payment_transaction_log (id, payment_id, transaction_type, payment_gateway_ref, amount, note, processed_at) VALUES
(1, 1, 'Charge', 'rzp_live_984128941', 13950.0, 'Initial booking charge captured and locked in AgroSafe Escrow Vault.', '2026-08-02 08:52:00+00'),
(2, 2, 'Charge', 'rzp_live_871239011', 16950.0, 'Pre-stay booking hold in escrow vault.', '2026-05-18 05:45:00+00'),
(3, 2, 'Payout', 'payout_bank_991823', 16500.0, 'Stay completed safely. Escrow payout disbursed to Vikram Singh.', '2026-06-06 04:00:00+00'),
(4, 3, 'Charge', 'rzp_live_761298412', 11250.0, 'Pre-stay escrow booking hold.', '2026-08-01 11:10:00+00'),
(5, 3, 'Refund', 'rfnd_rzp_761298412_01', 11250.0, '100% Emergency Escrow Refund triggered via Joshimath Landslide Warning.', '2026-08-07 12:45:00+00'),
(6, 4, 'Charge', 'rzp_live_891023441', 17850.0, 'Pre-stay hold locked in escrow for upcoming autumn stay.', '2026-08-10 14:30:00+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('payment_transaction_log_id_seq', (SELECT MAX(id) FROM payment_transaction_log));

-- 10. SEED BOOKING STATUS LOGS
INSERT INTO booking_status_log (id, booking_id, previous_status, new_status, reason, changed_at) VALUES
(1, 1, 'Pending', 'Confirmed', 'Escrow payment authorized', '2026-08-02 08:52:00+00'),
(2, 2, 'Confirmed', 'Completed', 'Guest checkout completed with verified host feedback', '2026-06-05 05:30:00+00'),
(3, 3, 'Confirmed', 'Cancelled', 'Active hazard warning in Joshimath sector — automatic 100% guest refund processed', '2026-08-07 12:45:00+00'),
(4, 4, 'Pending', 'Confirmed', 'Escrow payment captured', '2026-08-10 14:30:00+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('booking_status_log_id_seq', (SELECT MAX(id) FROM booking_status_log));

-- 11. SEED NOTIFICATION LOGS
INSERT INTO notification_log (id, user_id, warning_id, related_booking_id, notification_type, title, message_content, is_read, severity, dispatched_at) VALUES
(1, 3, 1, 3, 'Push', 'Hazard Alert: Joshimath Sector', 'A verified mudslide debris flow was reported near Joshimath. Your booking ref AGS-47612 has been refunded under 100% Escrow Protection.', false, 'warning', '2026-08-07 12:45:00+00'),
(2, 1, 2, null, 'SMS', 'Manual Warning Broadcast Active', 'Your manual safety alert for Parashar hill slope has been broadcast across the regional safety network.', true, 'info', '2026-08-06 09:35:00+00'),
(3, 2, null, 2, 'Push', 'Escrow Payout Credited: ₹16,500', 'Pooja Sharma''s checkout at Naggar Heritage Apple Estate was completed. Funds released to your bank account.', true, 'info', '2026-06-06 04:05:00+00'),
(4, 4, null, 4, 'Email', 'Booking Confirmation & Escrow Hold', 'Your reservation AGS-49102 at Sangla Valley Saffron & Almond Estate is confirmed and secured in escrow.', false, 'info', '2026-08-10 14:32:00+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('notification_log_id_seq', (SELECT MAX(id) FROM notification_log));
