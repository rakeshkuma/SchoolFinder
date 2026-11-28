-- Descriptions and facilities for seven of the most-shown school profiles that were noindex as bare CBSE listings
-- (Search Console, 31 Oct - 27 Nov 2026). Every statement was checked on 28 Nov 2026 against the page of the school's own
-- website named with it, and is written in SchoolDhundo's words (tools/seo/data/profile-description-drafts-2026-11-28.md).
-- A description replaces only the board-list record copied in ("Listed by CBSE as ..."), never one an editor wrote; a
-- facility is added only if the profile lists none of that name. Every change is in the audit log. With a description of
-- 300 or more characters each profile is indexable again under the existing rule (SchoolRepository.INDEXABLE).

WITH v(slug, description, sources) AS (VALUES
    ('k-k-cambridge-international-school',
     'K K Cambridge International School is a CBSE-affiliated school in Amravati, Maharashtra (affiliation no. 1130896, up to Class X), founded in 2016. According to its website it stands near Amravati University and has digital smart classrooms, a learning resource centre with a computer lab of more than 25 computers and a library, play areas and a Wi-Fi campus, and it provides school transport.',
     'https://www.kkcambridgeschool.org/ and /facilities'),
    ('moga-devi-minda-memorial-school',
     'Moga Devi Minda Memorial School is an English-medium, co-educational senior secondary school at Bagla, Hisar, affiliated to CBSE (affiliation no. 531009). Its website says it was founded in 2010 by the late Shadi Lal Minda of the Minda Group of industries, on a 16-acre campus with physics, chemistry, biology, computer and language labs, an ATL (tinkering) lab, a robotics lab, a library and a 400-metre track.',
     'https://www.mdmms.edu.in/about-school.html and /our-founder.html'),
    ('swami-vivekananda-vidya-peedam',
     'Swami Vivekananda Vidya Peedam is a CBSE-affiliated senior secondary school (affiliation no. 1931024, up to Class XII) at Sriperumbudur in Kanchipuram district, Tamil Nadu. Its website lists smart classrooms with interactive boards, physics, chemistry, biology, mathematics and computer laboratories, a library with books, periodicals and audio-visual media, a phonics lab for KG to Class V, a canteen and a health centre.',
     'https://vivekanandavidya.edu.in/svvp/facilities.php, /history.php and /principal.php'),
    ('edify-school-amravati',
     'Edify School Amravati is a CBSE-affiliated senior secondary school (affiliation no. 1130732) on Chandurbazar Road at Kathora, Amravati (PIN 444602), founded in 2015. Its website says it is run under MDN Edify Education Pvt. Ltd., an initiative of the DRS Group, and describes programmes from the pre-primary years (IK1 to IK3) through primary and middle school to Classes 11 and 12.',
     'https://edifyschoolamravati.com/who-we-are/about-the-school/ and the home page'),
    ('little-flower-english-medium-school-chelavoor',
     'Little Flower English Medium School is a CBSE-affiliated senior secondary school (affiliation no. 930940) at Chelavoor in Kozhikode district, Kerala, run by the CST Fathers of the St. Thomas Province. Its website describes an eleven-acre campus with computer and science laboratories, an auditorium, an indoor stadium, a basketball court, a library and robotics and language labs, and it runs school buses.',
     'https://littleflowerkkd.ac.in/about/history and the home page'),
    ('kamalavati-higher-secondary-school',
     'Kamalavati Higher Secondary School in Thoothukudi (Tuticorin), Tamil Nadu, is a CBSE-affiliated senior secondary school (affiliation no. 1930074). Its website says the school was founded and registered in 1972 and has been affiliated to CBSE since then; it has an ATL (tinkering) lab and runs school buses, including routes for students from farther areas such as SPIC and Udankudi.',
     'https://khsse.com/ and /infrastructure/'),
    ('sambhota-tibetan-school-mundgod-tibetan-colony-n-kanara',
     'Sambhota Tibetan School at Camp 3 of the Tibetan settlement in Mundgod (Uttara Kannada, Karnataka) is a CBSE-affiliated senior secondary school (affiliation no. 890002). Its website says it was founded in 1969 as CST Mundgod to educate Tibetan children while preserving their culture, was taken over by the Central Tibetan Schools Administration in 1970, and offers boarding at the senior secondary level and vocational streams.',
     'https://stsm3.wordpress.com/about-us/')
), described AS (
    UPDATE school s
    SET description = v.description, updated_at = now()
    FROM v
    WHERE s.slug = v.slug AND s.active AND (s.description IS NULL OR s.description LIKE 'Listed by CBSE as%')
    RETURNING s.id, v.sources
)
INSERT INTO admin_audit_log (actor, action, entity_type, entity_id, details, created_at)
SELECT 'system', 'SCHOOL_FACTS_UPDATED', 'SCHOOL', id,
       'Description written from the school''s own website (' || sources || '), checked 28 Nov 2026. Migration V52.', now()
FROM described;

WITH f(slug, category, name, description, source_url) AS (VALUES
    ('k-k-cambridge-international-school', 'OTHER', 'Smart classrooms', NULL, 'https://www.kkcambridgeschool.org/'),
    ('k-k-cambridge-international-school', 'COMPUTER', 'Computer lab', 'More than 25 computers', 'https://www.kkcambridgeschool.org/facilities'),
    ('k-k-cambridge-international-school', 'LIBRARY', 'Library', NULL, 'https://www.kkcambridgeschool.org/facilities'),
    ('k-k-cambridge-international-school', 'SPORTS', 'Play areas', NULL, 'https://www.kkcambridgeschool.org/'),
    ('k-k-cambridge-international-school', 'OTHER', 'Wi-Fi campus', NULL, 'https://www.kkcambridgeschool.org/'),
    ('k-k-cambridge-international-school', 'TRANSPORT', 'School transport', NULL, 'https://www.kkcambridgeschool.org/'),
    ('moga-devi-minda-memorial-school', 'LABORATORY', 'Physics lab', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'LABORATORY', 'Chemistry lab', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'LABORATORY', 'Biology lab', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'COMPUTER', 'Computer lab', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'LABORATORY', 'Language lab', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'LABORATORY', 'ATL (tinkering) lab', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'LABORATORY', 'Robotics lab', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'LIBRARY', 'Library', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'SPORTS', '400-metre track', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'OTHER', 'Smart classrooms', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'OTHER', 'Cafeteria', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'HEALTH', 'Infirmary', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('moga-devi-minda-memorial-school', 'TRANSPORT', 'School transport', NULL, 'https://www.mdmms.edu.in/about-school.html'),
    ('swami-vivekananda-vidya-peedam', 'OTHER', 'Smart classrooms', 'Interactive boards', 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'LABORATORY', 'Physics lab', NULL, 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'LABORATORY', 'Chemistry lab', NULL, 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'LABORATORY', 'Biology lab', NULL, 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'LABORATORY', 'Mathematics lab', NULL, 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'COMPUTER', 'Computer lab', NULL, 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'LIBRARY', 'Library', 'Books, periodicals and audio-visual media', 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'OTHER', 'Phonics lab', 'For KG to Class V', 'https://vivekanandavidya.edu.in/svvp/facilities.php'),
    ('swami-vivekananda-vidya-peedam', 'OTHER', 'Canteen', NULL, 'https://vivekanandavidya.edu.in/svvp/principal.php'),
    ('swami-vivekananda-vidya-peedam', 'HEALTH', 'Health centre', NULL, 'https://vivekanandavidya.edu.in/svvp/principal.php'),
    ('little-flower-english-medium-school-chelavoor', 'COMPUTER', 'Computer lab', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'LABORATORY', 'Physics lab', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'LABORATORY', 'Chemistry lab', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'LABORATORY', 'Biology lab', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'LABORATORY', 'Mathematics lab', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'LABORATORY', 'Language lab', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'LABORATORY', 'Robotics lab', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'LIBRARY', 'Library', NULL, 'https://littleflowerkkd.ac.in/'),
    ('little-flower-english-medium-school-chelavoor', 'OTHER', 'Auditorium', NULL, 'https://littleflowerkkd.ac.in/about/history'),
    ('little-flower-english-medium-school-chelavoor', 'SPORTS', 'Indoor stadium', NULL, 'https://littleflowerkkd.ac.in/about/history'),
    ('little-flower-english-medium-school-chelavoor', 'SPORTS', 'Basketball court', NULL, 'https://littleflowerkkd.ac.in/about/history'),
    ('little-flower-english-medium-school-chelavoor', 'TRANSPORT', 'School bus', NULL, 'https://littleflowerkkd.ac.in/'),
    ('kamalavati-higher-secondary-school', 'LABORATORY', 'ATL (tinkering) lab', NULL, 'https://khsse.com/'),
    ('kamalavati-higher-secondary-school', 'TRANSPORT', 'School transport', 'Routes include SPIC and Udankudi', 'https://khsse.com/infrastructure/'),
    ('sambhota-tibetan-school-mundgod-tibetan-colony-n-kanara', 'HOSTEL', 'Boarding', 'At the senior secondary level', 'https://stsm3.wordpress.com/about-us/'),
    ('sambhota-tibetan-school-mundgod-tibetan-colony-n-kanara', 'TRANSPORT', 'School buses', 'Two buses run by the settlement office, from the nine camps', 'https://stsm3.wordpress.com/about-us/')
), added AS (
    INSERT INTO school_facility (school_id, category, name, description, available, source_url, verification_status,
                                 last_verified_date, created_at, updated_at)
    SELECT s.id, f.category, f.name, f.description, TRUE, f.source_url, 'VERIFIED', DATE '2026-11-28', now(), now()
    FROM f
    JOIN school s ON s.slug = f.slug AND s.active
    WHERE NOT EXISTS (SELECT 1 FROM school_facility x WHERE x.school_id = s.id AND lower(x.name) = lower(f.name))
    RETURNING school_id, name
)
INSERT INTO admin_audit_log (actor, action, entity_type, entity_id, details, created_at)
SELECT 'system', 'SCHOOL_FACTS_UPDATED', 'SCHOOL', school_id,
       'Facilities from the school''s own website, checked 28 Nov 2026: ' || string_agg(name, ', ' ORDER BY name)
           || '. Migration V52.', now()
FROM added
GROUP BY school_id;
