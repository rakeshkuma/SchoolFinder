-- Reference data only: boards, class levels, ranking criteria and official data sources.
-- No school records are seeded here; school data is loaded through the validated CSV import.

INSERT INTO education_board (code, name, website_url, description) VALUES
    ('CBSE', 'Central Board of Secondary Education', 'https://www.cbse.gov.in/', 'National board under the Ministry of Education, Government of India.'),
    ('CISCE', 'Council for the Indian School Certificate Examinations (ICSE/ISC)', 'https://cisce.org/', 'Conducts the ICSE (Class X) and ISC (Class XII) examinations.'),
    ('IB', 'International Baccalaureate', 'https://www.ibo.org/', 'International programmes including PYP, MYP, DP and CP.'),
    ('CAMBRIDGE', 'Cambridge International Education', 'https://www.cambridgeinternational.org/', 'Cambridge IGCSE and International AS & A Level qualifications.'),
    ('NIOS', 'National Institute of Open Schooling', 'https://www.nios.ac.in/', 'Open schooling board under the Ministry of Education.'),
    ('OTHER', 'Other / multiple curricula', NULL, 'Curriculum not covered by the boards above, or a combination stated by the school.');

INSERT INTO school_class (code, name, stage, sort_order) VALUES
    ('PRE_NURSERY', 'Pre-Nursery', 'PRE_PRIMARY', 1),
    ('NURSERY', 'Nursery', 'PRE_PRIMARY', 2),
    ('KG', 'KG / Pre-Primary', 'PRE_PRIMARY', 3),
    ('I', 'Class I', 'PRIMARY', 4),
    ('II', 'Class II', 'PRIMARY', 5),
    ('III', 'Class III', 'PRIMARY', 6),
    ('IV', 'Class IV', 'PRIMARY', 7),
    ('V', 'Class V', 'PRIMARY', 8),
    ('VI', 'Class VI', 'MIDDLE', 9),
    ('VII', 'Class VII', 'MIDDLE', 10),
    ('VIII', 'Class VIII', 'MIDDLE', 11),
    ('IX', 'Class IX', 'SECONDARY', 12),
    ('X', 'Class X', 'SECONDARY', 13),
    ('XI', 'Class XI', 'SENIOR_SECONDARY', 14),
    ('XII', 'Class XII', 'SENIOR_SECONDARY', 15);

-- Initial proposed weights (sum = 100). Administrators may change them; a change triggers recalculation.
INSERT INTO ranking_criterion (code, name, description, weight, display_order) VALUES
    ('ACADEMIC_PERFORMANCE', 'Academic performance', 'Board examination outcomes and other verified academic results.', 25.00, 1),
    ('TEACHING_QUALITY', 'Teaching quality', 'Verified teacher qualifications, student-teacher ratio and inspection findings.', 20.00, 2),
    ('INFRASTRUCTURE', 'Infrastructure', 'Classrooms, laboratories, library and digital facilities documented by the school or inspection reports.', 15.00, 3),
    ('SAFETY_WELLBEING', 'Student safety and well-being', 'Safety certifications, counselling, health and child-protection measures.', 15.00, 4),
    ('SPORTS_EXTRACURRICULAR', 'Sports and extracurricular activities', 'Sports facilities and documented co-curricular programmes.', 10.00, 5),
    ('PARENT_FEEDBACK', 'Parent feedback', 'Average of approved parent reviews on this site (requires a minimum number of reviews).', 10.00, 6),
    ('ACCESSIBILITY_TRANSPORT', 'Accessibility and transport', 'Barrier-free access, CWSN support and school transport availability.', 5.00, 7);

INSERT INTO data_source (name, url, source_type, publisher, description) VALUES
    ('Directorate of Education, GNCT of Delhi', 'https://www.edudel.nic.in/', 'GOVERNMENT', 'Government of NCT of Delhi', 'School directories, admission guidelines, fee orders and circulars for Delhi schools.'),
    ('Central Board of Secondary Education', 'https://www.cbse.gov.in/', 'EDUCATION_BOARD', 'Ministry of Education, Government of India', 'Affiliation details and board circulars.'),
    ('CBSE SARAS affiliation portal', 'https://saras.cbse.gov.in/', 'EDUCATION_BOARD', 'CBSE', 'Affiliated school search and mandatory disclosures.'),
    ('OpenStreetMap', 'https://www.openstreetmap.org/', 'MAP_DATA', 'OpenStreetMap contributors', 'Map tiles and geocoding (ODbL licence).');
