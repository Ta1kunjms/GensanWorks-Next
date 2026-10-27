-- GensanWorks demo seed: 23 Mindanao employers, 113 jobs, 117 jobseekers (+ profile detail rows)
-- Date: 2026-10-22 · Requested by the owner for matching demos and screenshots.
--
-- SYNTHETIC DATA (pilot constraint #2). Employer names are real Mindanao
-- organizations, but every contact detail, person, TIN, document path and job
-- posting here is invented. Emails use the reserved test domain
-- @demo.gensanworks.test and phones the unassigned 0900 prefix, so nothing can
-- reach a real person. None of these profiles has a login (no auth.users rows).
--
-- Remove everything this seed created with docs/seed/demo-mindanao-cleanup.sql.
-- Re-running is refused while seeded employers exist.

CREATE OR REPLACE FUNCTION pg_temp.pick(a text[]) RETURNS text LANGUAGE sql VOLATILE
AS $f$ SELECT a[1 + floor(random() * array_length(a, 1))::int] $f$;

CREATE OR REPLACE FUNCTION pg_temp.rint(lo int, hi int) RETURNS int LANGUAGE sql VOLATILE
AS $f$ SELECT lo + floor(random() * (hi - lo + 1))::int $f$;

CREATE OR REPLACE FUNCTION pg_temp.fake_tin() RETURNS text LANGUAGE sql VOLATILE
AS $f$ SELECT format('%s-%s-%s-000', pg_temp.rint(100, 999), pg_temp.rint(100, 999), pg_temp.rint(100, 999)) $f$;

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.employers WHERE email LIKE '%@demo.gensanworks.test')
     OR EXISTS (SELECT 1 FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test') THEN
    RAISE EXCEPTION 'Demo seed already present; run docs/seed/demo-mindanao-cleanup.sql first';
  END IF;
END $guard$;

SELECT setseed(0.20261022);

-- ─── Employers ───────────────────────────────────────────────────────────────
CREATE TEMP TABLE _emp (
  k text, name text, slug text, city text, province text, barangay text, address text,
  industry text, code text, employees int, geo text, contact text, designation text, chair text, sec text
) ON COMMIT DROP;

INSERT INTO _emp VALUES
('gtc','General Tuna Corporation','general-tuna','General Santos City','South Cotabato','Tambler','Purok Tuna, Makar Wharf Road, Brgy. Tambler, General Santos City','Manufacturing','04,02',1800,'126303000','Ma. Theresa Villaflor','HR Manager','Romualdo Sabado','Leonora Cabahug'),
('citramina','Citra Mina Group of Companies','citra-mina','General Santos City','South Cotabato','Tambler','Citra Mina Compound, Makar Wharf Road, Brgy. Tambler, General Santos City','Manufacturing','04,02',3000,'126303000','Rogelio Montecillo','Talent Acquisition Head','Romualdo Sabado','Leonora Cabahug'),
('philbest','Philbest Canning Corporation','philbest-canning','General Santos City','South Cotabato','Calumpang','National Highway, Brgy. Calumpang, General Santos City','Manufacturing','04',900,'126303000','Josefina Lagura','Human Resource Officer','Teodoro Pepito','Cynthia Basa'),
('seatrade','Seatrade Development Corporation','seatrade','General Santos City','South Cotabato','Tambler','Makar Wharf Road, Brgy. Tambler, General Santos City','Manufacturing','04',700,'126303000','Arturo Dumdum','HR and Admin Supervisor','Romualdo Sabado','Leonora Cabahug'),
('rd','RD Corporation','rd-corporation','General Santos City','South Cotabato','Dadiangas West','RD Plaza, Pioneer Avenue, Brgy. Dadiangas West, General Santos City','Finance','10',1200,'126303000','Evangeline Ybañez','Recruitment Manager','Ernesto Gelito','Maricel Escalante'),
('kcc','KCC Mall of Gensan','kcc-mall-gensan','General Santos City','South Cotabato','Lagao','Jose Catolico Sr. Avenue, Brgy. Lagao, General Santos City','Retail','07',1500,'126303000','Rosalinda Tabanao','HR Manager','Virgilio Lumbos','Nenita Sumagaysay'),
('socoteco','South Cotabato II Electric Cooperative (SOCOTECO II)','socoteco-ii','General Santos City','South Cotabato','City Heights','Jose Catolico Sr. Avenue, Brgy. City Heights, General Santos City','Energy','05',650,'126303000','Danilo Cabrera','Human Resource Division Manager','Felipe Robles','Annaliza Valdez'),
('steliz','St. Elizabeth Hospital, Inc.','st-elizabeth-hospital','General Santos City','South Cotabato','Lagao','National Highway, Brgy. Lagao, General Santos City','Healthcare','14',800,'126303000','Grace Fajardo','Chief Human Resource Officer','Virgilio Lumbos','Nenita Sumagaysay'),
('gsdh','General Santos Doctors'' Hospital','gensan-doctors-hospital','General Santos City','South Cotabato','Dadiangas East','National Highway, Brgy. Dadiangas East, General Santos City','Healthcare','14',500,'126303000','Marivic Ocampo','HR Officer','Bienvenido Alba','Rowena Ancheta'),
('nddu','Notre Dame of Dadiangas University','nddu','General Santos City','South Cotabato','Lagao','Marist Avenue, Brgy. Lagao, General Santos City','Education','13',600,'126303000','Fr. Ramon Ignacio','Human Resource Director','Virgilio Lumbos','Nenita Sumagaysay'),
('htc','Holy Trinity College of General Santos City','holy-trinity-college','General Santos City','South Cotabato','Dadiangas East','Daproza Avenue, Brgy. Dadiangas East, General Santos City','Education','13',350,'126303000','Sr. Lourdes Pascual','Personnel Officer','Bienvenido Alba','Rowena Ancheta'),
('msu','Mindanao State University – General Santos','msu-gensan','General Santos City','South Cotabato','Fatima','Brgy. Fatima, General Santos City','Education','13',700,'126303000','Norhana Guiamal','HRMO III','Esmael Kamid','Lorna Domingo'),
('greenleaf','Greenleaf Hotel','greenleaf-hotel','General Santos City','South Cotabato','Lagao','Jose Catolico Sr. Avenue, Brgy. Lagao, General Santos City','Hospitality','08',180,'126303000','Kristine Navarro','HR and Training Manager','Virgilio Lumbos','Nenita Sumagaysay'),
('phela','Phela Grande Hotel','phela-grande-hotel','General Santos City','South Cotabato','Dadiangas East','Magsaysay Avenue, Brgy. Dadiangas East, General Santos City','Hospitality','08',150,'126303000','Leah Morales','HR Supervisor','Bienvenido Alba','Rowena Ancheta'),
('dole','Dole Philippines, Inc.','dole-philippines','Polomolok','South Cotabato','Cannery Site','Cannery Site, Polomolok, South Cotabato','Agriculture','01,04',9000,'126311000','Manuel Gutierrez','Talent Acquisition Manager','Rodrigo Salazar','Imelda Quijano'),
('sec','Sarangani Energy Corporation','sarangani-energy','Maasim','Sarangani','Kamanga','Brgy. Kamanga, Maasim, Sarangani','Energy','05',300,'128005000','Jonathan Uy','HR and Admin Manager','Abdulrahman Taha','Merlinda Sison'),
('dlpc','Davao Light and Power Company','davao-light','Davao City','Davao del Sur','Poblacion District','C. Bangoy Street, Poblacion District, Davao City','Energy','05',1200,'112402000','Patricia Lim','Team Member Relations Manager','Rolando Torres','Carmelita Umali'),
('lapanday','Lapanday Foods Corporation','lapanday-foods','Davao City','Davao del Sur','Bajada','J.P. Laurel Avenue, Brgy. Bajada, Davao City','Agriculture','01',5000,'112402000','Antonio Hernandez','Recruitment and Staffing Head','Celso Zamora','Divina Tolentino'),
('nccc','New City Commercial Corporation (NCCC)','nccc','Davao City','Davao del Sur','Matina Crossing','MacArthur Highway, Brgy. Matina Crossing, Davao City','Retail','07',4000,'112402000','Lorraine Go','HR Recruitment Supervisor','Eduardo Jimenez','Florencia Pacheco'),
('brokenshire','Brokenshire Integrated Health Ministries, Inc.','brokenshire','Davao City','Davao del Sur','Madapo','Madapo Hills, Davao City','Healthcare','14',1100,'112402000','Ruth Castillo','Human Resource Manager','Gregorio Baguio','Teresita Yap'),
('addu','Ateneo de Davao University','ateneo-de-davao','Davao City','Davao del Sur','Poblacion District','E. Jacinto Street, Poblacion District, Davao City','Education','13',1500,'112402000','Michelle Tan','University Human Resource Director','Rolando Torres','Carmelita Umali'),
('damosa','Damosa Land, Inc.','damosa-land','Davao City','Davao del Sur','Lanang','Damosa IT Park, J.P. Laurel Avenue, Brgy. Lanang, Davao City','Real Estate','11',250,'112402000','Carlo Reyes','HR Business Partner','Alfredo Mendoza','Gloria Bautista'),
('xu','Xavier University – Ateneo de Cagayan','xavier-university','Cagayan de Oro City','Misamis Oriental','Poblacion','Corrales Avenue, Poblacion, Cagayan de Oro City','Education','13',1300,'104305000','Jose Mari Villanueva','Human Resource Management Office Director','Ramil Flores','Susana Garcia');

INSERT INTO public.employers (
  email, establishment_name, province, city, barangay, address, total_paid_employees, total_vacant_positions,
  industry, industry_code, contact_person, contact_phone, designation, company_tax_id, geographic_code,
  barangay_chairperson, barangay_secretary, srs_subscriber_intent, srs_prepared_by, srs_prepared_designation,
  srs_prepared_date, srs_prepared_contact, srs_form_file, business_permit_file, bir_2303_file,
  company_profile_file, dole_certification_file, profile_image, account_status, verified_at, is_active,
  created_at, updated_at, consent_given_at, consent_privacy_notice_version
)
SELECT
  'hr.' || e.slug || '@demo.gensanworks.test', e.name, e.province, e.city, e.barangay, e.address, e.employees, 0,
  e.industry, e.code, e.contact, '09009' || lpad(e.rn::text, 6, '0'), e.designation, pg_temp.fake_tin(), e.geo,
  e.chair, e.sec, true, e.contact, e.designation,
  (e.created - interval '1 day')::date, '09009' || lpad(e.rn::text, 6, '0'),
  'employer-documents/demo/' || e.slug || '/srs-form-2.pdf',
  'employer-documents/demo/' || e.slug || '/business-permit-2026.pdf',
  'employer-documents/demo/' || e.slug || '/bir-form-2303.pdf',
  'employer-documents/demo/' || e.slug || '/company-profile.pdf',
  'employer-documents/demo/' || e.slug || '/dole-certification.pdf',
  '/peso-gsc-logo.png', 'approved', e.created + interval '2 days', true,
  e.created, e.created + interval '2 days', e.created,
  'development-synthetic-data-only-pending-peso-msu-approval'
FROM (
  SELECT _emp.*, row_number() OVER () AS rn,
         now() - make_interval(days => pg_temp.rint(60, 120)) AS created
  FROM _emp
) e;

-- ─── Jobs ────────────────────────────────────────────────────────────────────
-- (employer key, title, minimum education, skills, years, salary min, salary max,
--  period, contract P/T/C, vacancies, work setup, work type, duties)
CREATE TEMP TABLE _jt (
  k text, title text, edu text, skills text, yrs int, smin numeric, smax numeric,
  period text, contract text, vac int, setup text, wtype text, duties text
) ON COMMIT DROP;

INSERT INTO _jt VALUES
-- General Tuna Corporation (6)
('gtc','Fish Processor','High School Graduate','Fish Filleting, Food Safety (HACCP), Sanitation',0,430,470,'daily','C',30,'onsite','Full-time','Thaw, clean, loin and pre-cook tuna on the processing line while following HACCP and plant sanitation rules'),
('gtc','Quality Control Inspector','College Graduate','Quality Inspection, Food Safety (HACCP), Laboratory Testing',1,18000,22000,'monthly','P',3,'onsite','Full-time','Inspect raw materials and finished canned tuna, record critical control points and hold non-conforming lots'),
('gtc','Retort Machine Operator','Vocational / TESDA Graduate','Machine Operation, Preventive Maintenance, Food Safety (HACCP)',1,450,500,'daily','P',4,'onsite','Full-time','Operate retort sterilizers, monitor time and temperature charts and report deviations to the shift supervisor'),
('gtc','Maintenance Electrician','Vocational / TESDA Graduate','Electrical Installation, Industrial Wiring, Preventive Maintenance',2,16000,20000,'monthly','P',2,'onsite','Full-time','Maintain motors, panels and plant wiring and carry out the preventive maintenance schedule'),
('gtc','Warehouse Checker','High School Graduate','Inventory Control, Forklift Operation, Record Keeping',1,430,460,'daily','P',4,'onsite','Full-time','Check incoming and outgoing finished goods, update stock cards and coordinate loading with forklift operators'),
('gtc','HR Assistant','College Graduate','Payroll Processing, MS Excel, Recruitment',1,16000,19000,'monthly','P',1,'onsite','Full-time','Prepare payroll inputs, maintain 201 files and schedule interviews for production hiring'),
-- Citra Mina (7)
('citramina','Tuna Grader','High School Graduate','Fish Grading, Food Safety (HACCP), Cold Chain Handling',1,450,520,'daily','C',6,'onsite','Full-time','Grade fresh and frozen tuna by size and quality at the fish port and keep cold chain records'),
('citramina','Fishing Vessel Deckhand','High School Graduate','Seamanship, Fishing Gear Handling, Basic Safety Training',0,12000,15000,'monthly','C',15,'onsite','Full-time','Handle purse seine and handline gear, assist in fish hold icing and keep the deck safe during voyages'),
('citramina','Marine Engine Mechanic','Vocational / TESDA Graduate','Marine Engine Repair, Diesel Engine Maintenance, Welding',3,20000,26000,'monthly','P',3,'onsite','Full-time','Overhaul and troubleshoot marine diesel engines of the fishing fleet and keep maintenance logs'),
('citramina','Food Technologist','College Graduate','Food Safety (HACCP), Product Development, Laboratory Testing',1,22000,28000,'monthly','P',2,'onsite','Full-time','Develop new tuna products, run shelf-life tests and keep the HACCP plan current'),
('citramina','Production Supervisor','College Graduate','Production Planning, People Management, Food Safety (HACCP)',3,25000,32000,'monthly','P',2,'onsite','Full-time','Lead a processing shift, plan line staffing and meet daily output and quality targets'),
('citramina','Export Documentation Clerk','College Graduate','Export Documentation, MS Excel, Record Keeping',1,17000,20000,'monthly','P',2,'onsite','Full-time','Prepare export permits, packing lists and certificates for frozen tuna shipments'),
('citramina','Cold Storage Operator','Vocational / TESDA Graduate','Refrigeration Systems, Cold Chain Handling, Forklift Operation',1,460,500,'daily','P',4,'onsite','Full-time','Run blast freezers and cold rooms, monitor temperatures and move pallets with a forklift'),
-- Philbest Canning (5)
('philbest','Can Seamer Operator','Vocational / TESDA Graduate','Machine Operation, Preventive Maintenance, Quality Inspection',1,450,490,'daily','P',3,'onsite','Full-time','Set up and run can seaming machines and perform hourly seam teardown checks'),
('philbest','Fish Processor','High School Graduate','Fish Filleting, Food Safety (HACCP), Sanitation',0,430,460,'daily','C',25,'onsite','Full-time','Clean and loin pre-cooked tuna and pack fish into cans according to fill-weight standards'),
('philbest','Laboratory Analyst','College Graduate','Laboratory Testing, Microbiology, Food Safety (HACCP)',1,20000,24000,'monthly','P',2,'onsite','Full-time','Run microbiological and histamine tests on raw fish and finished goods and file lab reports'),
('philbest','Boiler Operator','Vocational / TESDA Graduate','Boiler Operation, Preventive Maintenance, Industrial Safety',2,18000,22000,'monthly','P',2,'onsite','Full-time','Operate and monitor plant boilers, log pressures and follow boiler safety procedures'),
('philbest','Inventory Clerk','College Graduate','Inventory Control, MS Excel, Record Keeping',1,15000,18000,'monthly','P',2,'onsite','Full-time','Reconcile raw material and packaging inventory and prepare weekly stock reports'),
-- Seatrade (4)
('seatrade','Fish Processor','High School Graduate','Fish Filleting, Food Safety (HACCP), Sanitation',0,430,460,'daily','C',20,'onsite','Full-time','Process frozen tuna loins and saku blocks for export following sanitation standards'),
('seatrade','Packing Line Worker','High School Graduate','Packing, Food Safety (HACCP), Sanitation',0,430,450,'daily','C',15,'onsite','Full-time','Vacuum-pack, label and box frozen tuna products for export'),
('seatrade','Refrigeration Technician','Vocational / TESDA Graduate','Refrigeration Systems, Electrical Installation, Troubleshooting',2,18000,23000,'monthly','P',2,'onsite','Full-time','Maintain ammonia and freon refrigeration units and respond to cold room alarms'),
('seatrade','Safety Officer','College Graduate','Occupational Safety and Health, Incident Reporting, Industrial Safety',2,22000,27000,'monthly','P',1,'onsite','Full-time','Run the plant OSH program, conduct toolbox meetings and investigate incidents'),
-- RD Corporation (4)
('rd','Pawnshop Appraiser','College Graduate','Jewelry Appraisal, Customer Service, Cash Handling',1,15000,18000,'monthly','P',4,'onsite','Full-time','Appraise jewelry and gadgets for pawn, process loans and redemptions and balance the daily cash'),
('rd','Bank Teller','College Graduate','Cash Handling, Customer Service, MS Excel',0,16000,19000,'monthly','P',3,'onsite','Full-time','Process deposits, withdrawals and remittances and keep the teller cash balanced'),
('rd','Accounting Staff','College Graduate','Bookkeeping, MS Excel, Financial Reporting',1,18000,22000,'monthly','P',2,'onsite','Full-time','Record journal entries, reconcile bank accounts and help prepare monthly financial statements'),
('rd','IT Support Specialist','College Graduate','Computer Hardware Servicing, Networking, Technical Support',1,18000,23000,'monthly','P',1,'hybrid','Full-time','Support branch computers, printers and network links and keep the asset inventory current'),
-- KCC Mall of Gensan (6)
('kcc','Sales Clerk','High School Graduate','Customer Service, Product Knowledge, Inventory Control',0,430,450,'daily','C',20,'onsite','Full-time','Assist shoppers in the department store, restock shelves and keep the selling area tidy'),
('kcc','Cashier','Senior High School Graduate','Cash Handling, POS Operation, Customer Service',0,430,450,'daily','C',12,'onsite','Full-time','Operate the POS terminal, handle cash and card payments and close the register accurately'),
('kcc','Merchandiser','High School Graduate','Visual Merchandising, Inventory Control, Customer Service',0,430,450,'daily','C',8,'onsite','Full-time','Set up product displays, monitor stock levels and coordinate deliveries with suppliers'),
('kcc','Customer Service Associate','College Graduate','Customer Service, Complaint Handling, MS Office',1,15000,17000,'monthly','P',3,'onsite','Full-time','Handle mall concierge inquiries, complaints and gift certificate sales'),
('kcc','Building Maintenance Technician','Vocational / TESDA Graduate','Electrical Installation, Plumbing, Preventive Maintenance',2,16000,19000,'monthly','P',2,'onsite','Full-time','Repair lighting, plumbing and fixtures in the mall and follow the preventive maintenance plan'),
('kcc','Security Guard','High School Graduate','Security Procedures, Incident Reporting, CCTV Monitoring',1,15000,16500,'monthly','C',6,'onsite','Full-time','Guard mall entrances, inspect bags and monitor CCTV during the assigned shift'),
-- SOCOTECO II (5)
('socoteco','Lineman','Vocational / TESDA Graduate','Line Maintenance, Electrical Installation, Climbing Safety',1,18000,22000,'monthly','P',6,'onsite','Full-time','Install and repair distribution lines, transformers and service drops and respond to outages'),
('socoteco','Meter Reader','High School Graduate','Meter Reading, Data Entry, Customer Service',0,14000,16000,'monthly','P',5,'onsite','Full-time','Read kilowatt-hour meters on assigned routes and upload readings to the billing system'),
('socoteco','Billing Clerk','College Graduate','Billing, MS Excel, Customer Service',1,16000,18000,'monthly','P',2,'onsite','Full-time','Prepare consumer bills, verify adjustments and answer billing inquiries'),
('socoteco','Electrical Engineer','College Graduate','Power Distribution, AutoCAD, Project Management',2,30000,38000,'monthly','P',2,'onsite','Full-time','Design distribution line extensions, supervise substation projects and review load studies'),
('socoteco','Customer Service Representative','College Graduate','Customer Service, Complaint Handling, Data Entry',0,15000,17000,'monthly','P',3,'onsite','Full-time','Process new connection applications and record consumer complaints at the front office'),
-- St. Elizabeth Hospital (5)
('steliz','Staff Nurse','College Graduate','Patient Care, IV Therapy, Basic Life Support, Medication Administration',1,25000,30000,'monthly','P',10,'onsite','Full-time','Provide bedside nursing care, administer medications and IV therapy and document patient progress'),
('steliz','Medical Technologist','College Graduate','Laboratory Testing, Phlebotomy, Microbiology',1,24000,28000,'monthly','P',3,'onsite','Full-time','Perform hematology, chemistry and microbiology tests and release validated results'),
('steliz','Nursing Aide','Vocational / TESDA Graduate','Patient Care, Caregiving, Basic Life Support',0,14000,16000,'monthly','C',6,'onsite','Full-time','Assist nurses with patient hygiene, feeding, turning and transport'),
('steliz','Radiologic Technologist','College Graduate','X-ray Imaging, Patient Care, Radiation Safety',1,24000,28000,'monthly','P',2,'onsite','Full-time','Take diagnostic X-ray and CT images and follow radiation safety protocols'),
('steliz','Pharmacist','College Graduate','Pharmacy Dispensing, Inventory Control, Patient Counseling',1,25000,30000,'monthly','P',2,'onsite','Full-time','Dispense prescriptions, counsel patients and manage the hospital pharmacy stock'),
-- GenSan Doctors' Hospital (4)
('gsdh','Staff Nurse','College Graduate','Patient Care, IV Therapy, Basic Life Support, Medication Administration',1,24000,29000,'monthly','P',8,'onsite','Full-time','Care for ward patients, carry out doctors orders and keep nursing records complete'),
('gsdh','Emergency Room Nurse','College Graduate','Emergency Care, Triage, Basic Life Support, IV Therapy',2,28000,33000,'monthly','P',4,'onsite','Full-time','Triage emergency patients, assist in resuscitation and stabilize patients for admission'),
('gsdh','Medical Records Clerk','College Graduate','Medical Records Management, Data Entry, MS Excel',0,15000,17000,'monthly','P',2,'onsite','Full-time','Encode and file patient charts and prepare records for PhilHealth claims'),
('gsdh','Housekeeping Attendant','High School Graduate','Housekeeping, Sanitation, Infection Control',0,430,450,'daily','C',5,'onsite','Full-time','Clean patient rooms and common areas following infection control procedures'),
-- NDDU (4)
('nddu','College Instructor – Information Technology','College Graduate','Programming, Database Management, Lesson Planning',2,25000,32000,'monthly','P',2,'onsite','Full-time','Teach programming and database courses, prepare syllabi and advise capstone projects'),
('nddu','Senior High School Teacher – STEM','College Graduate','Lesson Planning, Classroom Management, Mathematics',1,22000,26000,'monthly','P',3,'onsite','Full-time','Teach general mathematics and pre-calculus and prepare learners for STEM college programs'),
('nddu','Registrar Staff','College Graduate','Records Management, MS Office, Customer Service',1,16000,18000,'monthly','P',1,'onsite','Full-time','Process enrollment, transcripts and student records requests'),
('nddu','Guidance Counselor','College Graduate','Counseling, Psychological Assessment, Record Keeping',2,25000,30000,'monthly','P',1,'onsite','Full-time','Provide individual counseling, run career guidance programs and keep confidential records'),
-- Holy Trinity College (4)
('htc','Elementary Teacher','College Graduate','Lesson Planning, Classroom Management, Child Development',0,18000,22000,'monthly','P',3,'onsite','Full-time','Handle a Grade 3 class, prepare lesson plans and track learner progress'),
('htc','Junior High School English Teacher','College Graduate','Lesson Planning, Classroom Management, English Communication',1,20000,24000,'monthly','P',2,'onsite','Full-time','Teach English 7 to 10 and coach students for school publication and speech events'),
('htc','Accounting Clerk','College Graduate','Bookkeeping, MS Excel, Payroll Processing',1,15000,18000,'monthly','P',1,'onsite','Full-time','Record tuition collections, prepare payroll and reconcile school accounts'),
('htc','Laboratory Custodian','Vocational / TESDA Graduate','Laboratory Management, Inventory Control, Laboratory Safety',0,14000,16000,'monthly','P',1,'onsite','Full-time','Prepare science laboratory materials, keep inventory and enforce lab safety rules'),
-- MSU General Santos (4)
('msu','Instructor – Fisheries Technology','College Graduate','Aquaculture, Fisheries Management, Lesson Planning',2,32000,38000,'monthly','P',2,'onsite','Full-time','Teach fisheries and aquaculture courses and supervise student hatchery practicum'),
('msu','Administrative Aide','College Graduate','Records Management, MS Office, Customer Service',0,14000,17000,'monthly','C',3,'onsite','Full-time','Handle office correspondence, encode records and assist students at the college office'),
('msu','IT Systems Administrator','College Graduate','Networking, Linux Administration, Database Management',2,28000,34000,'monthly','P',1,'onsite','Full-time','Administer campus servers and network and back up the student information system'),
('msu','Research Assistant','College Graduate','Data Analysis, Research Writing, Laboratory Testing',0,18000,21000,'monthly','C',2,'onsite','Full-time','Collect field and laboratory data and help write research reports for funded projects'),
-- Greenleaf Hotel (5)
('greenleaf','Front Desk Agent','College Graduate','Front Office Operations, Customer Service, Reservation Systems',0,15000,17000,'monthly','P',3,'onsite','Full-time','Check guests in and out, manage reservations and handle guest requests'),
('greenleaf','Room Attendant','High School Graduate','Housekeeping, Sanitation, Customer Service',0,430,450,'daily','P',5,'onsite','Full-time','Clean and set up guest rooms to hotel standards and report maintenance issues'),
('greenleaf','Line Cook','Vocational / TESDA Graduate','Cookery, Food Safety (HACCP), Kitchen Sanitation',1,450,500,'daily','P',4,'onsite','Full-time','Prepare a la carte and banquet dishes and keep the kitchen station clean'),
('greenleaf','Food and Beverage Server','High School Graduate','Food and Beverage Service, Customer Service, POS Operation',0,430,450,'daily','C',6,'onsite','Full-time','Serve restaurant and banquet guests and process orders through the POS'),
('greenleaf','Sales and Marketing Executive','College Graduate','Sales, Social Media Marketing, Customer Relations',2,20000,26000,'monthly','P',1,'hybrid','Full-time','Sell rooms and function packages to corporate accounts and run the hotel social media pages'),
-- Phela Grande Hotel (4)
('phela','Front Desk Agent','College Graduate','Front Office Operations, Customer Service, Reservation Systems',0,15000,17000,'monthly','P',3,'onsite','Full-time','Welcome guests, process bookings and settle guest folios'),
('phela','Housekeeping Supervisor','Vocational / TESDA Graduate','Housekeeping, People Management, Quality Inspection',2,17000,20000,'monthly','P',1,'onsite','Full-time','Assign room attendants, inspect cleaned rooms and manage linen inventory'),
('phela','Pastry Cook','Vocational / TESDA Graduate','Bread and Pastry Production, Food Safety (HACCP), Cookery',1,450,500,'daily','P',2,'onsite','Full-time','Bake breads, cakes and desserts for the restaurant and events'),
('phela','Bartender','Vocational / TESDA Graduate','Bartending, Food and Beverage Service, Customer Service',1,430,470,'daily','C',2,'onsite','Part-time','Mix drinks, manage bar stock and serve lounge guests during evening shifts'),
-- Dole Philippines (8)
('dole','Packing House Worker','High School Graduate','Packing, Quality Inspection, Sanitation',0,430,460,'daily','C',40,'onsite','Full-time','Sort, grade and pack fresh pineapples for export and keep the packing area clean'),
('dole','Plantation Field Worker','Elementary Graduate','Crop Production, Harvesting, Pesticide Handling',0,430,450,'daily','C',50,'onsite','Full-time','Plant, maintain and harvest pineapple in assigned blocks following safe chemical handling rules'),
('dole','Agricultural Technician','College Graduate','Crop Production, Pest Management, Soil Analysis',1,20000,25000,'monthly','P',4,'onsite','Full-time','Monitor crop health, scout pests and recommend fertilizer programs for plantation blocks'),
('dole','Heavy Equipment Operator','Vocational / TESDA Graduate','Heavy Equipment Operation, Preventive Maintenance, Defensive Driving',2,18000,22000,'monthly','P',5,'onsite','Full-time','Operate tractors, boom sprayers and harvesters and do daily equipment checks'),
('dole','Truck Driver','High School Graduate','Defensive Driving, Vehicle Maintenance, Cargo Handling',2,16000,19000,'monthly','P',6,'onsite','Full-time','Haul fruit from the fields to the cannery and port and keep trip logs'),
('dole','Forklift Operator','Vocational / TESDA Graduate','Forklift Operation, Inventory Control, Warehouse Safety',1,450,480,'daily','P',6,'onsite','Full-time','Move finished goods pallets in the cannery warehouse and load container vans'),
('dole','Industrial Electrician','Vocational / TESDA Graduate','Industrial Wiring, Electrical Installation, PLC Programming',2,18000,23000,'monthly','P',3,'onsite','Full-time','Troubleshoot cannery motor controls and PLC panels and maintain plant electrical systems'),
('dole','Mechanical Engineer','College Graduate','Preventive Maintenance, AutoCAD, Machine Design',2,32000,40000,'monthly','P',2,'onsite','Full-time','Plan maintenance of cannery machines, design equipment improvements and lead technicians'),
-- Sarangani Energy (4)
('sec','Plant Operator','Vocational / TESDA Graduate','Boiler Operation, Power Plant Operation, Industrial Safety',2,22000,28000,'monthly','P',4,'onsite','Full-time','Operate coal-fired boiler and turbine systems from the control room and log plant parameters'),
('sec','Instrumentation Technician','Vocational / TESDA Graduate','Instrumentation and Control, PLC Programming, Troubleshooting',2,22000,27000,'monthly','P',2,'onsite','Full-time','Calibrate transmitters and control valves and troubleshoot the plant DCS'),
('sec','Environmental Officer','College Graduate','Environmental Compliance, Water Quality Monitoring, Report Writing',2,28000,34000,'monthly','P',1,'onsite','Full-time','Monitor emissions and effluent, prepare DENR compliance reports and run community environmental programs'),
('sec','Safety Officer','College Graduate','Occupational Safety and Health, Incident Reporting, Industrial Safety',3,28000,35000,'monthly','P',1,'onsite','Full-time','Implement the plant safety program, issue work permits and audit contractors'),
-- Davao Light (5)
('dlpc','Lineman','Vocational / TESDA Graduate','Line Maintenance, Electrical Installation, Climbing Safety',1,19000,23000,'monthly','P',6,'onsite','Full-time','Maintain overhead distribution lines and restore power during outages in Davao City'),
('dlpc','Customer Care Associate','College Graduate','Customer Service, Complaint Handling, Data Entry',0,17000,19000,'monthly','P',5,'onsite','Full-time','Answer customer calls and walk-in concerns about bills, service applications and outages'),
('dlpc','Electrical Engineer','College Graduate','Power Distribution, AutoCAD, Project Management',2,32000,40000,'monthly','P',2,'onsite','Full-time','Plan and supervise distribution system upgrades and review contractor designs'),
('dlpc','Field Collector','High School Graduate','Cash Handling, Customer Service, Defensive Driving',1,16000,18000,'monthly','P',4,'onsite','Full-time','Collect payments and deliver disconnection notices on assigned routes'),
('dlpc','Data Analyst','College Graduate','Data Analysis, SQL, MS Excel, Power BI',1,28000,35000,'monthly','P',1,'hybrid','Full-time','Build dashboards on reliability and sales data and support management reporting'),
-- Lapanday Foods (6)
('lapanday','Banana Plantation Worker','High School Graduate','Crop Production, Harvesting, Bagging and Deflowering',0,480,500,'daily','C',40,'onsite','Full-time','Bag, deflower and harvest Cavendish bananas and maintain plantation drainage'),
('lapanday','Packing Plant Quality Controller','College Graduate','Quality Inspection, Food Safety (HACCP), Report Writing',1,18000,22000,'monthly','P',4,'onsite','Full-time','Inspect banana hands for export defects and prepare daily quality reports'),
('lapanday','Farm Supervisor','College Graduate','Crop Production, People Management, Pest Management',3,28000,34000,'monthly','P',2,'onsite','Full-time','Supervise field crews, track farm productivity and implement pest control programs'),
('lapanday','Agricultural Engineer','College Graduate','Irrigation Design, AutoCAD, Farm Machinery',2,30000,36000,'monthly','P',1,'onsite','Full-time','Design and maintain irrigation and cableway systems for the plantations'),
('lapanday','Logistics Coordinator','College Graduate','Logistics Planning, MS Excel, Export Documentation',2,22000,27000,'monthly','P',2,'onsite','Full-time','Schedule fruit trucking and container loading and complete export shipping documents'),
('lapanday','Diesel Mechanic','Vocational / TESDA Graduate','Diesel Engine Maintenance, Vehicle Maintenance, Welding',2,18000,22000,'monthly','P',3,'onsite','Full-time','Repair farm trucks, tractors and pumps and keep service records'),
-- NCCC (6)
('nccc','Sales Associate','High School Graduate','Customer Service, Product Knowledge, Inventory Control',0,481,500,'daily','C',25,'onsite','Full-time','Assist customers in the department store and keep merchandise displays organized'),
('nccc','Cashier','Senior High School Graduate','Cash Handling, POS Operation, Customer Service',0,481,500,'daily','C',15,'onsite','Full-time','Process supermarket transactions and balance the cash drawer at shift end'),
('nccc','Stockman','High School Graduate','Inventory Control, Cargo Handling, Warehouse Safety',0,481,500,'daily','C',10,'onsite','Full-time','Receive deliveries, replenish shelves and keep the stockroom in order'),
('nccc','Store Supervisor','College Graduate','People Management, Inventory Control, Customer Service',3,22000,26000,'monthly','P',3,'onsite','Full-time','Supervise floor staff, manage store inventory and resolve customer escalations'),
('nccc','Meat Cutter','Vocational / TESDA Graduate','Meat Cutting, Food Safety (HACCP), Sanitation',1,490,520,'daily','P',3,'onsite','Full-time','Cut, trim and pack pork, beef and chicken for the supermarket meat section'),
('nccc','Baker','Vocational / TESDA Graduate','Bread and Pastry Production, Food Safety (HACCP), Cookery',1,490,520,'daily','P',4,'onsite','Full-time','Bake breads and pastries for the in-store bakeshop following product standards'),
-- Brokenshire (5)
('brokenshire','Staff Nurse','College Graduate','Patient Care, IV Therapy, Basic Life Support, Medication Administration',1,26000,32000,'monthly','P',12,'onsite','Full-time','Provide nursing care in medical-surgical wards and coordinate with the health care team'),
('brokenshire','Medical Technologist','College Graduate','Laboratory Testing, Phlebotomy, Microbiology',1,25000,29000,'monthly','P',3,'onsite','Full-time','Process clinical specimens and maintain laboratory quality control'),
('brokenshire','Respiratory Therapist','College Graduate','Respiratory Care, Patient Care, Basic Life Support',1,25000,30000,'monthly','P',2,'onsite','Full-time','Provide oxygen therapy, nebulization and ventilator care for patients'),
('brokenshire','Physical Therapist','College Graduate','Physical Therapy, Patient Care, Rehabilitation',1,25000,30000,'monthly','P',2,'onsite','Full-time','Assess and treat outpatients and inpatients needing rehabilitation'),
('brokenshire','Billing Officer','College Graduate','Billing, MS Excel, PhilHealth Claims Processing',1,18000,21000,'monthly','P',2,'onsite','Full-time','Prepare patient statements of account and process PhilHealth and HMO claims'),
-- Ateneo de Davao (5)
('addu','College Instructor – Computer Science','College Graduate','Programming, Database Management, Lesson Planning',2,30000,38000,'monthly','P',2,'onsite','Full-time','Teach programming and data structures courses and mentor student research'),
('addu','Software Developer','College Graduate','JavaScript, SQL, Web Development',2,30000,40000,'monthly','P',2,'hybrid','Full-time','Build and maintain university web systems for enrollment and student services'),
('addu','Library Assistant','College Graduate','Library Management, Records Management, Customer Service',0,16000,18000,'monthly','P',1,'onsite','Full-time','Catalog materials, assist library users and manage circulation'),
('addu','Admissions Officer','College Graduate','Customer Service, Records Management, Public Speaking',1,20000,24000,'monthly','P',1,'onsite','Full-time','Process applicants, run campus tours and present programs at school visits'),
('addu','Campus Security Officer','High School Graduate','Security Procedures, CCTV Monitoring, Incident Reporting',1,16000,18000,'monthly','C',4,'onsite','Full-time','Patrol campus buildings, control gate access and log security incidents'),
-- Damosa Land (3)
('damosa','Property Sales Agent','College Graduate','Sales, Customer Relations, Negotiation',1,18000,25000,'monthly','P',5,'hybrid','Full-time','Sell residential lots and condominium units, conduct site trippings and close buyer reservations'),
('damosa','Civil Engineer','College Graduate','Structural Design, AutoCAD, Construction Management',2,30000,38000,'monthly','P',2,'onsite','Full-time','Supervise building construction, check contractor work and prepare progress billings'),
('damosa','Building Maintenance Technician','Vocational / TESDA Graduate','Electrical Installation, Plumbing, Preventive Maintenance',2,17000,20000,'monthly','P',2,'onsite','Full-time','Maintain building electrical, plumbing and air-conditioning systems in the IT park'),
-- Xavier University (4)
('xu','College Instructor – Agriculture','College Graduate','Crop Production, Lesson Planning, Research Writing',2,30000,36000,'monthly','P',2,'onsite','Full-time','Teach crop science courses and supervise student farm practicum'),
('xu','IT Support Specialist','College Graduate','Computer Hardware Servicing, Networking, Technical Support',1,20000,24000,'monthly','P',2,'onsite','Full-time','Maintain computer laboratories and campus network and assist faculty with technology'),
('xu','Research Assistant','College Graduate','Data Analysis, Research Writing, Laboratory Testing',0,18000,21000,'monthly','C',2,'onsite','Full-time','Help faculty researchers gather data, run analyses and prepare reports'),
('xu','Accounting Staff','College Graduate','Bookkeeping, MS Excel, Financial Reporting',1,20000,24000,'monthly','P',1,'onsite','Full-time','Record university disbursements, reconcile accounts and support the year-end audit');

INSERT INTO public.jobs (
  employer_id, position_title, description, location, category, minimum_education_required, main_skill_desired,
  years_of_experience_required, age_preference_min, age_preference_max, starting_salary, salary_min, salary_max,
  salary_period, work_setup, work_type, job_status, employment_contract_type, industry_code, vacancies,
  is_active, archived, published_at, created_at, updated_at
)
SELECT
  em.id, t.title,
  format('%s is hiring %s for the position of %s at its %s operations. Key duties: %s. Qualifications: %s; %s; skills in %s. Interested applicants may apply through GensanWorks or get a PESO General Santos referral.',
         em.establishment_name,
         CASE WHEN t.vac = 1 THEN 'one (1) qualified applicant' ELSE t.vac || ' qualified applicants' END,
         t.title, em.city, t.duties, t.edu,
         CASE WHEN t.yrs = 0 THEN 'fresh graduates are welcome' ELSE format('at least %s year(s) of related experience', t.yrs) END,
         t.skills),
  em.city || ', ' || em.province, em.industry, t.edu, t.skills,
  -- RA 10911 prohibits age preferences in job ads, so the full legal working-age range is used.
  t.yrs, 18, 60,
  CASE WHEN t.period = 'daily' THEN format('₱%s/day', to_char(t.smin, 'FM999,999')) ELSE format('₱%s/month', to_char(t.smin, 'FM999,999')) END,
  t.smin, t.smax, t.period, t.setup, t.wtype, 'active', t.contract, split_part(em.industry_code, ',', 1), t.vac,
  true, false, p.published, p.published, p.published
FROM _jt t
JOIN _emp e ON e.k = t.k
JOIN public.employers em ON em.email = 'hr.' || e.slug || '@demo.gensanworks.test'
CROSS JOIN LATERAL (SELECT now() - make_interval(days => pg_temp.rint(1, 45), hours => pg_temp.rint(0, 23)) AS published) p;

UPDATE public.employers em
SET total_vacant_positions = v.total
FROM (SELECT employer_id, sum(vacancies)::int AS total FROM public.jobs GROUP BY employer_id) v
WHERE v.employer_id = em.id AND em.email LIKE '%@demo.gensanworks.test';

-- ─── Jobseeker profile clusters ──────────────────────────────────────────────
-- Each cluster lines a jobseeker's preferred occupations, skills, schooling,
-- work history, training and license up with real openings above.
CREATE TEMP TABLE _cl (
  id int, occ1 text, occ2 text, occ3 text, skills text[], boxes text[], edu text, courses text[], strand text,
  positions text[], companies text[], tcourse text, thours int, tinst text, tskills text,
  elig text, prof text, resp text, selfemp text
) ON COMMIT DROP;

INSERT INTO _cl VALUES
(1,'Fish Processor','Quality Control Inspector','Packing Line Worker',
 ARRAY['Fish Filleting','Food Safety (HACCP)','Sanitation','Packing','Quality Inspection'],ARRAY['Domestic Chores','Others'],'High School',
 ARRAY['Senior High School – TVL Food Processing'],'TVL',
 ARRAY['Fish Processor','Packer','Production Helper'],ARRAY['Tambler Cold Storage Services','Labangal Fish Drying Center','Dadiangas Seafood Trading'],
 'Food Processing NC II',316,'TESDA Provincial Training Center – General Santos','Fish Filleting, Food Safety (HACCP)',
 'TESDA National Certificate II','Food Processing NC II','Processed and packed fish products according to sanitation and HACCP rules','Fisherfolk'),
(2,'Staff Nurse','Emergency Room Nurse','Nursing Aide',
 ARRAY['Patient Care','IV Therapy','Basic Life Support','Medication Administration','Emergency Care','Triage'],ARRAY['Computer Literate','Others'],'College',
 ARRAY['Bachelor of Science in Nursing'],'STEM',
 ARRAY['Staff Nurse','Clinical Instructor Assistant','Company Nurse'],ARRAY['Mindanao Medical Center','Koronadal Doctors Clinic','Polomolok Municipal Health Office'],
 'Basic Life Support and Advanced Cardiac Life Support',16,'Philippine Heart Association – South Cotabato Chapter','Basic Life Support, Emergency Care',
 'Professional Regulation Commission','Registered Nurse','Provided bedside care, administered medications and kept patient charts updated','Others'),
(3,'Medical Technologist','Laboratory Analyst','Research Assistant',
 ARRAY['Laboratory Testing','Phlebotomy','Microbiology','Data Analysis','Research Writing'],ARRAY['Computer Literate','Others'],'College',
 ARRAY['Bachelor of Science in Medical Technology','Bachelor of Science in Biology'],'STEM',
 ARRAY['Medical Technologist','Laboratory Aide','Quality Control Analyst'],ARRAY['Gensan Diagnostic Laboratory','South Cotabato Provincial Hospital Laboratory','Lagao Medical Clinic'],
 'Laboratory Quality Management Training',24,'Philippine Association of Medical Technologists – Region XII','Laboratory Testing, Microbiology',
 'Professional Regulation Commission','Registered Medical Technologist','Performed laboratory tests and maintained quality control records','Others'),
(4,'Elementary Teacher','Junior High School English Teacher','Senior High School Teacher – STEM',
 ARRAY['Lesson Planning','Classroom Management','English Communication','Child Development','Mathematics'],ARRAY['Computer Literate','Others'],'College',
 ARRAY['Bachelor of Elementary Education','Bachelor of Secondary Education major in English','Bachelor of Secondary Education major in Mathematics'],'HUMSS',
 ARRAY['Teacher','Tutor','Teacher Aide'],ARRAY['Bright Minds Learning Center','Dadiangas Tutorial Services','Lagao Christian Academy'],
 'Differentiated Instruction Workshop',24,'DepEd Division of General Santos City','Lesson Planning, Classroom Management',
 'Professional Regulation Commission','Licensed Professional Teacher','Planned lessons, handled classes and assessed learner progress','Freelancer'),
(5,'Lineman','Maintenance Electrician','Industrial Electrician',
 ARRAY['Electrical Installation','Industrial Wiring','Line Maintenance','Preventive Maintenance','Climbing Safety','Troubleshooting'],ARRAY['Electrician','Others'],'Vocational',
 ARRAY['Electrical Installation and Maintenance'],'TVL',
 ARRAY['Electrician','Electrical Helper','Lineman Apprentice'],ARRAY['Calumpang Electrical Contractors','Mabuhay Electrical Services','Polomolok Power Works'],
 'Electrical Installation and Maintenance NC II',196,'TESDA Regional Training Center XII – Koronadal','Electrical Installation, Industrial Wiring',
 'TESDA National Certificate II','Electrical Installation and Maintenance NC II','Installed and repaired wiring, panels and lighting for residential and commercial clients','Others'),
(6,'Truck Driver','Heavy Equipment Operator','Forklift Operator',
 ARRAY['Defensive Driving','Vehicle Maintenance','Cargo Handling','Forklift Operation','Heavy Equipment Operation'],ARRAY['Driver','Auto Mechanic'],'High School',
 ARRAY['Secondary Education'],'GAS',
 ARRAY['Delivery Driver','Truck Helper','Forklift Driver'],ARRAY['Siguel Hauling Services','Bula Trucking Enterprises','Apopong Rice Mill and Trading'],
 'Driving NC II',118,'TESDA Provincial Training Center – General Santos','Defensive Driving, Vehicle Maintenance',
 'Land Transportation Office','Professional Driver''s License (Restriction Codes B, C)','Delivered goods safely on schedule and performed daily vehicle checks','Driver'),
(7,'Sales Clerk','Cashier','Merchandiser',
 ARRAY['Customer Service','Cash Handling','POS Operation','Inventory Control','Visual Merchandising','Product Knowledge'],ARRAY['Computer Literate','Others'],'High School',
 ARRAY['Senior High School – ABM'],'ABM',
 ARRAY['Sales Clerk','Cashier','Promodiser'],ARRAY['Dadiangas Grocery Mart','Lagao Department Store','City Heights Minimart'],
 'Customer Services NC II',53,'TESDA Provincial Training Center – General Santos','Customer Service, Cash Handling',
 'TESDA National Certificate II','Customer Services NC II','Assisted customers, handled cash sales and kept shelves stocked','Vendor'),
(8,'Front Desk Agent','Room Attendant','Food and Beverage Server',
 ARRAY['Front Office Operations','Housekeeping','Food and Beverage Service','Customer Service','Reservation Systems','Bartending'],ARRAY['Domestic Chores','Others'],'College',
 ARRAY['Bachelor of Science in Hospitality Management','Bachelor of Science in Tourism Management'],'HUMSS',
 ARRAY['Front Desk Clerk','Room Attendant','Waiter'],ARRAY['Sarangani Bay Resort','Gensan Pension House','Lagao Events Place and Catering'],
 'Housekeeping NC II',436,'Goldenstate College','Housekeeping, Front Office Operations',
 'TESDA National Certificate II','Housekeeping NC II','Served guests, prepared rooms and handled reservations','Others'),
(9,'Line Cook','Baker','Pastry Cook',
 ARRAY['Cookery','Bread and Pastry Production','Food Safety (HACCP)','Kitchen Sanitation','Meat Cutting'],ARRAY['Domestic Chores','Others'],'Vocational',
 ARRAY['Cookery','Bread and Pastry Production'],'TVL',
 ARRAY['Kitchen Helper','Cook','Baker'],ARRAY['Dadiangas Bakeshop','Calumpang Grill and Restaurant','Fatima Carinderia and Catering'],
 'Cookery NC II',316,'Mindanao Polytechnic College','Cookery, Food Safety (HACCP)',
 'TESDA National Certificate II','Cookery NC II','Prepared meals and baked goods and kept the kitchen clean and safe','Business Owner'),
(10,'Accounting Staff','Accounting Clerk','Billing Clerk',
 ARRAY['Bookkeeping','MS Excel','Payroll Processing','Financial Reporting','Billing','Data Entry','Records Management'],ARRAY['Computer Literate','Stenography'],'College',
 ARRAY['Bachelor of Science in Accountancy','Bachelor of Science in Business Administration major in Financial Management'],'ABM',
 ARRAY['Accounting Clerk','Bookkeeper','Billing Assistant'],ARRAY['South Cotabato Credit Cooperative','Lagao Hardware and Construction Supply','Dadiangas Lending Corporation'],
 'Bookkeeping NC III',292,'TESDA Provincial Training Center – General Santos','Bookkeeping, Financial Reporting',
 'Civil Service Commission','Career Service Professional Eligibility','Recorded transactions, prepared payroll and reconciled accounts','Freelancer'),
(11,'IT Support Specialist','Software Developer','IT Systems Administrator',
 ARRAY['Computer Hardware Servicing','Networking','Technical Support','JavaScript','SQL','Web Development','Linux Administration','Database Management','Programming'],ARRAY['Computer Literate','Others'],'College',
 ARRAY['Bachelor of Science in Information Technology','Bachelor of Science in Computer Science'],'STEM',
 ARRAY['IT Support Technician','Junior Web Developer','Computer Technician'],ARRAY['Gensan Computer Center','Dadiangas Web Solutions','City Heights Internet Cafe and Repair'],
 'Computer Systems Servicing NC II',280,'STI College – General Santos','Computer Hardware Servicing, Networking',
 'TESDA National Certificate II','Computer Systems Servicing NC II','Set up computers and networks, fixed hardware issues and built small web systems','Freelancer'),
(12,'Agricultural Technician','Plantation Field Worker','Farm Supervisor',
 ARRAY['Crop Production','Harvesting','Pest Management','Pesticide Handling','Soil Analysis','Bagging and Deflowering'],ARRAY['Gardening','Others'],'College',
 ARRAY['Bachelor of Science in Agriculture major in Agronomy','Bachelor of Science in Agricultural Technology'],'STEM',
 ARRAY['Farm Worker','Agricultural Technician','Farm Aide'],ARRAY['Tupi Vegetable Farms','Polomolok Pineapple Growers Cooperative','Sarangani Banana Growers Association'],
 'Agricultural Crops Production NC II',336,'TESDA Regional Training Center XII – Koronadal','Crop Production, Pest Management',
 'Professional Regulation Commission','Licensed Agriculturist','Planted and harvested crops, monitored pests and applied fertilizer programs','Farmer'),
(13,'Mechanical Engineer','Electrical Engineer','Civil Engineer',
 ARRAY['Preventive Maintenance','AutoCAD','Machine Design','Power Distribution','Project Management','Structural Design','Construction Management'],ARRAY['Computer Literate','Others'],'College',
 ARRAY['Bachelor of Science in Mechanical Engineering','Bachelor of Science in Electrical Engineering','Bachelor of Science in Civil Engineering'],'STEM',
 ARRAY['Junior Engineer','Project Engineer','Maintenance Engineer'],ARRAY['Gensan Builders and Construction','South Cotabato Engineering Services','Calumpang Machine Shop'],
 'AutoCAD 2D and 3D Drafting',40,'Mindanao State University – General Santos','AutoCAD, Machine Design',
 'Professional Regulation Commission','Registered Engineer','Prepared designs, supervised site work and planned equipment maintenance','Freelancer'),
(14,'Refrigeration Technician','Building Maintenance Technician','Diesel Mechanic',
 ARRAY['Refrigeration Systems','Plumbing','Diesel Engine Maintenance','Marine Engine Repair','Welding','Troubleshooting','Machine Operation','Preventive Maintenance'],ARRAY['Auto Mechanic','Plumbing'],'Vocational',
 ARRAY['Refrigeration and Air-conditioning Servicing','Automotive Servicing'],'TVL',
 ARRAY['Aircon Technician','Mechanic','Maintenance Helper'],ARRAY['Lagao Auto Repair Shop','Dadiangas Refrigeration and Aircon Services','Tambler Marine Engine Works'],
 'Refrigeration and Air-conditioning Servicing NC II',316,'TESDA Provincial Training Center – General Santos','Refrigeration Systems, Troubleshooting',
 'TESDA National Certificate II','RAC Servicing NC II','Installed, repaired and maintained refrigeration units and engines','Others'),
(15,'Security Guard','Campus Security Officer','CCTV Operator',
 ARRAY['Security Procedures','CCTV Monitoring','Incident Reporting'],ARRAY['Driver','Others'],'High School',
 ARRAY['Secondary Education'],'GAS',
 ARRAY['Security Guard','Bodyguard','Watchman'],ARRAY['Sarangani Security Agency','Gensan Protective Services','Mindanao Guards and Watchmen Agency'],
 'Security Services NC II',150,'Mindanao Security Training Institute','Security Procedures, Incident Reporting',
 'PNP Supervisory Office for Security and Investigation Agencies','Security Guard License','Secured premises, logged visitors and reported incidents','Others'),
(16,'Fishing Vessel Deckhand','Tuna Grader','Cold Storage Operator',
 ARRAY['Seamanship','Fishing Gear Handling','Basic Safety Training','Fish Grading','Cold Chain Handling'],ARRAY['Others'],'High School',
 ARRAY['Secondary Education'],'TVL',
 ARRAY['Deckhand','Fish Port Laborer','Ice Plant Helper'],ARRAY['Gensan Fishing Ventures','Labangal Purse Seine Operators','Tambler Ice Plant'],
 'Basic Safety Training (STCW)',40,'Mindanao Maritime Training Center','Seamanship, Basic Safety Training',
 'Maritime Industry Authority','Seafarer''s Identification and Record Book','Handled fishing gear, iced the catch and kept the deck safe','Fisherfolk'),
(17,'Customer Service Representative','Customer Care Associate','Administrative Aide',
 ARRAY['Customer Service','Complaint Handling','Data Entry','MS Office','Records Management','Public Speaking'],ARRAY['Computer Literate','Stenography'],'College',
 ARRAY['Bachelor of Arts in Communication','Bachelor of Science in Business Administration'],'HUMSS',
 ARRAY['Customer Service Representative','Office Clerk','Call Center Agent'],ARRAY['Davao BPO Solutions','Gensan Telecom Service Center','Lagao Business Center'],
 'Contact Center Services NC II',100,'STI College – General Santos','Customer Service, Complaint Handling',
 'Civil Service Commission','Career Service Subprofessional Eligibility','Answered customer concerns, encoded records and handled office paperwork','Freelancer'),
(18,'Warehouse Checker','Inventory Clerk','Logistics Coordinator',
 ARRAY['Inventory Control','Record Keeping','Forklift Operation','Logistics Planning','Export Documentation','Warehouse Safety','MS Excel','Cargo Handling'],ARRAY['Computer Literate','Driver'],'College',
 ARRAY['Bachelor of Science in Customs Administration','Bachelor of Science in Business Administration major in Operations Management'],'ABM',
 ARRAY['Warehouse Checker','Inventory Assistant','Logistics Assistant'],ARRAY['Makar Port Logistics','Gensan Freight Forwarders','Calumpang Distribution Center'],
 'Warehouse Operations and Inventory Management',40,'Philippine Institute of Supply Management – Mindanao','Inventory Control, Logistics Planning',
 'Civil Service Commission','Career Service Subprofessional Eligibility','Checked deliveries, kept stock records and coordinated shipments','Others'),
(19,'Safety Officer','Environmental Officer','Production Supervisor',
 ARRAY['Occupational Safety and Health','Incident Reporting','Industrial Safety','Environmental Compliance','Water Quality Monitoring','Report Writing','People Management'],ARRAY['Computer Literate','Others'],'College',
 ARRAY['Bachelor of Science in Environmental Science','Bachelor of Science in Industrial Engineering'],'STEM',
 ARRAY['Safety Officer','Environmental Aide','Production Lead'],ARRAY['South Cotabato Environmental Services','Gensan Industrial Safety Consultants','Calumpang Manufacturing Corporation'],
 'Basic Occupational Safety and Health (40-hour BOSH)',40,'DOLE Occupational Safety and Health Center','Occupational Safety and Health, Incident Reporting',
 'DOLE Bureau of Working Conditions','Safety Officer 2 Accreditation','Ran safety inspections, toolbox talks and compliance reports','Others'),
(20,'Property Sales Agent','Sales and Marketing Executive','Pawnshop Appraiser',
 ARRAY['Sales','Customer Relations','Negotiation','Social Media Marketing','Jewelry Appraisal','Cash Handling'],ARRAY['Computer Literate','Photography'],'College',
 ARRAY['Bachelor of Science in Business Administration major in Marketing Management','Bachelor of Science in Entrepreneurship'],'ABM',
 ARRAY['Sales Agent','Marketing Assistant','Appraiser Trainee'],ARRAY['Gensan Realty Brokerage','Dadiangas Motor Sales','Lagao Pawnshop and Remittance'],
 'Real Estate Salesperson Accreditation Seminar',24,'Professional Regulation Commission – Region XII','Sales, Negotiation',
 'Professional Regulation Commission','Accredited Real Estate Salesperson','Generated leads, presented offers to clients and closed sales','Business Owner');

-- ─── Jobseekers (and their education, experience, languages, licenses, trainings) ───
DO $seed$
DECLARE
  males text[] := ARRAY['Juan','Jose','Mark','John Paul','Christian','Jericho','Rodel','Ronald','Jayson','Kevin','Michael','Joshua','Rey','Arnel','Ramil','Dennis','Noel','Ariel','Jomar','Carlo','Paolo','Vincent','Jerome','Allan','Romeo','Edgar','Renato','Jerwin','Kenneth','Bryan'];
  females text[] := ARRAY['Maria','Ana','Kristine','Jessa','Mary Joy','Lovely','Angelica','Rhea','Jennifer','Princess','Shiela','Gemma','Liza','Rowena','Grace','Joanna','Camille','Danica','Erika','Hazel','Irish','Janine','Mae','Nikka','Ruby','Charmaine','Kimberly','April','Jocelyn','Mylene'];
  m_males text[] := ARRAY['Abdulrahman','Jamil','Hassan','Faisal','Omar','Ismael','Rashid','Nasser','Alimudin','Kamarudin','Saidamen','Mohammad'];
  m_females text[] := ARRAY['Farida','Aisah','Sittie','Norhaya','Johaira','Jamila','Rahima','Amina','Fatima','Noraida','Sahara','Bainot'];
  surnames text[] := ARRAY['Dela Cruz','Santos','Reyes','Garcia','Mendoza','Villanueva','Ramos','Bautista','Castillo','Fernandez','Flores','Gonzales','Lopez','Morales','Navarro','Pascual','Torres','Tan','Lim','Go','Uy','Cabrera','Domingo','Fajardo','Gutierrez','Hernandez','Ignacio','Jimenez','Ocampo','Pacheco','Quijano','Robles','Sison','Tolentino','Umali','Valdez','Yap','Zamora','Alba','Ancheta','Tabanao','Lumbos','Sumagaysay','Cabahug','Dumdum','Pepito','Sabado','Ybañez','Montecillo','Lagura','Basa','Gelito','Escalante'];
  m_surnames text[] := ARRAY['Abdullah','Ali','Usman','Abubakar','Kamid','Guiamal','Mangelen','Sangki','Taha','Salik','Musa','Ibrahim'];
  gs_brgys text[] := ARRAY['Apopong','Baluan','Batomelong','Buayan','Bula','Calumpang','City Heights','Conel','Dadiangas East','Dadiangas North','Dadiangas South','Dadiangas West','Fatima','Katangawan','Labangal','Lagao','Ligaya','Mabuhay','Olympog','San Isidro','San Jose','Siguel','Sinawal','Tambler','Tinagacan','Upper Labay'];
  puroks text[] := ARRAY['Malipayon','Mabuhay','Sampaguita','Riverside','Bagong Silang','Masagana','Kalubihan','Pag-asa','Maunlad','San Roque','Matatag','Gumamela'];
  religions text[] := ARRAY['Roman Catholic','Roman Catholic','Roman Catholic','Roman Catholic','Roman Catholic','Iglesia ni Cristo','Born Again Christian','Seventh-day Adventist','Baptist','United Church of Christ in the Philippines'];
  civil text[] := ARRAY['Single','Single','Single','Single','Married','Married','Married','Widowed','Separated'];
  unemp_reasons text[] := ARRAY['Lost job/ terminated','End of contract','Resigned','Laid off','Due to calamity','Cannot find work','No work compatibility','Illness'];
  ofw_countries text[] := ARRAY['Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Hong Kong','Taiwan','Singapore','Japan'];
  overseas_prefs text[] := ARRAY['Japan','Canada','Australia','Saudi Arabia','United Arab Emirates','Qatar','Singapore','New Zealand','South Korea','Taiwan'];
  local_prefs text[] := ARRAY['General Santos City','Polomolok, South Cotabato','Koronadal City','Davao City','Alabel, Sarangani','Tupi, South Cotabato'];
  colleges text[] := ARRAY['Mindanao State University – General Santos','Notre Dame of Dadiangas University','Holy Trinity College of General Santos City','Ramon Magsaysay Memorial Colleges','Goldenstate College','STI College – General Santos','University of Mindanao'];
  voc_schools text[] := ARRAY['TESDA Provincial Training Center – General Santos','TESDA Regional Training Center XII – Koronadal','Mindanao Polytechnic College','Goldenstate College'];
  high_schools text[] := ARRAY['General Santos City National High School','Lagao National High School','Calumpang National High School','Fatima National High School','Labangal National High School','Notre Dame of Dadiangas University – High School','Polomolok National High School','Koronadal National Comprehensive High School'];
  i int; cl record; gender text; muslim boolean; fname text; lname text; mname text; suffix text;
  city text; prov text; brgy text; zip text; age int; bdate date; status text; seeking text;
  emp_type text; self_type text; self_other text; unemp_reason text; unemp_months int;
  former_ofw boolean; ofw_ctry text; is4ps boolean; pwd boolean; pwd_kind text; edu_level text;
  hs_year int; grad_year int; new_grad boolean; created timestamptz; jid uuid; n_exp int; k int;
  skills_pick text[]; city_roll float;
BEGIN
  FOR i IN 1..117 LOOP
    SELECT * INTO cl FROM _cl WHERE id = ((i - 1) % 20) + 1;

    gender := CASE WHEN random() < 0.5 THEN 'Male' ELSE 'Female' END;
    muslim := random() < 0.2;
    IF muslim THEN
      fname := pg_temp.pick(CASE WHEN gender = 'Male' THEN m_males ELSE m_females END);
      lname := pg_temp.pick(m_surnames);
      mname := pg_temp.pick(m_surnames);
    ELSE
      fname := pg_temp.pick(CASE WHEN gender = 'Male' THEN males ELSE females END);
      lname := pg_temp.pick(surnames);
      mname := pg_temp.pick(surnames);
    END IF;
    -- Only some people have a name suffix; others legitimately have none.
    suffix := CASE WHEN gender = 'Male' AND i % 15 = 0 THEN 'Jr.' WHEN gender = 'Male' AND i % 29 = 0 THEN 'III' ELSE NULL END;

    city_roll := random();
    IF city_roll < 0.80 THEN
      city := 'General Santos City'; prov := 'South Cotabato'; brgy := pg_temp.pick(gs_brgys); zip := '9500';
    ELSIF city_roll < 0.87 THEN
      city := 'Polomolok'; prov := 'South Cotabato'; brgy := pg_temp.pick(ARRAY['Poblacion','Cannery Site','Glamang','Magsaysay','Koronadal Proper']); zip := '9504';
    ELSIF city_roll < 0.92 THEN
      city := 'Koronadal City'; prov := 'South Cotabato'; brgy := pg_temp.pick(ARRAY['Zone IV','Morales','Carpenter Hill','Santo Niño','General Paulino Santos']); zip := '9506';
    ELSIF city_roll < 0.96 THEN
      city := 'Alabel'; prov := 'Sarangani'; brgy := pg_temp.pick(ARRAY['Poblacion','Maribulan','Spring','Kawas']); zip := '9501';
    ELSE
      city := 'Tupi'; prov := 'South Cotabato'; brgy := pg_temp.pick(ARRAY['Poblacion','Bunao','Crossing Rubber','Kablon']); zip := '9505';
    END IF;

    edu_level := cl.edu;
    new_grad := random() < 0.12;
    IF new_grad THEN
      age := CASE WHEN edu_level = 'College' THEN pg_temp.rint(21, 24) ELSE pg_temp.rint(19, 22) END;
    ELSE
      age := CASE WHEN edu_level = 'College' THEN pg_temp.rint(23, 48) ELSE pg_temp.rint(20, 50) END;
    END IF;
    bdate := (current_date - make_interval(years => age, days => pg_temp.rint(0, 360)))::date;
    hs_year := extract(year FROM bdate)::int + 18;
    grad_year := least(extract(year FROM current_date)::int - 1,
                       extract(year FROM bdate)::int + CASE WHEN edu_level = 'College' THEN 22 WHEN edu_level = 'Vocational' THEN 19 ELSE 18 END);

    -- Employment situation (NSRP Section III)
    emp_type := 'N/A'; self_type := 'N/A'; self_other := 'N/A'; unemp_reason := 'N/A'; unemp_months := 0;
    IF new_grad THEN
      status := 'Unemployed'; unemp_reason := 'New graduate'; unemp_months := pg_temp.rint(1, 8); seeking := 'actively_looking';
    ELSE
      CASE
        WHEN random() < 0.60 THEN
          status := 'Unemployed'; unemp_reason := pg_temp.pick(unemp_reasons); unemp_months := pg_temp.rint(1, 24); seeking := 'actively_looking';
        WHEN random() < 0.55 THEN
          status := 'Employed'; emp_type := pg_temp.pick(ARRAY['Full-Time','Part-Time','Contract']); seeking := 'open';
        ELSE
          status := 'Self-Employed'; self_type := cl.selfemp;
          self_other := CASE WHEN cl.selfemp = 'Others' THEN pg_temp.pick(ARRAY['Online Selling','Home-based Tutoring','Food Delivery Rider','Event Staff']) ELSE 'N/A' END;
          seeking := pg_temp.pick(ARRAY['actively_looking','open']);
      END CASE;
      IF i % 24 = 0 THEN seeking := 'not_looking'; END IF;
    END IF;

    former_ofw := NOT new_grad AND age > 28 AND random() < 0.12;
    ofw_ctry := CASE WHEN former_ofw THEN pg_temp.pick(ofw_countries) ELSE 'N/A' END;
    is4ps := random() < 0.15;
    pwd := i % 23 = 0;
    pwd_kind := CASE WHEN pwd THEN pg_temp.pick(ARRAY['Physical Disability','Hearing Disability','Visual Disability']) ELSE 'N/A' END;
    created := now() - make_interval(days => pg_temp.rint(1, 75), hours => pg_temp.rint(0, 23));
    skills_pick := cl.skills[1:least(array_length(cl.skills, 1), pg_temp.rint(3, 6))];

    INSERT INTO public.jobseekers (
      email, first_name, last_name, middle_name, suffix, birth_date, gender, religion, civil_status, tin, height,
      is_pwd, pwd_type, pwd_type_others, disability_visual, disability_speech, disability_mental, disability_hearing,
      disability_physical, disability_others, phone, house_number, barangay, city, province, zip_code,
      employment_status, employment_type, self_employed_type, self_employed_type_others, unemployed_reason,
      unemployed_months, unemployed_due_to_calamity, terminated_country, terminated_reason, is_ofw, ofw_country,
      is_former_ofw, former_ofw_country, former_ofw_return_month_year, is_four_ps, household_id_no,
      preference_part_time, preference_full_time, preferred_occupation_1, preferred_occupation_2, preferred_occupation_3,
      preferred_work_location_local, preferred_work_location_local_1, preferred_work_location_local_2, preferred_work_location_local_3,
      preferred_work_location_overseas, preferred_work_location_overseas_1, preferred_work_location_overseas_2, preferred_work_location_overseas_3,
      other_skills, other_skills_others, nsrp_id, profile_image, profile_complete, profile_completeness, is_active,
      created_at, updated_at, matching_completeness_pct, job_seeking_status, consent_given_at, consent_privacy_notice_version
    ) VALUES (
      lower(regexp_replace(fname, '[^A-Za-z]', '', 'g')) || '.' || lower(regexp_replace(lname, '[^A-Za-z]', '', 'g')) || i || '@demo.gensanworks.test',
      fname, lname, mname, suffix, bdate, gender,
      CASE WHEN muslim THEN 'Islam' ELSE pg_temp.pick(religions) END,
      CASE WHEN age < 24 THEN 'Single' ELSE pg_temp.pick(civil) END,
      pg_temp.fake_tin(),
      (CASE WHEN gender = 'Male' THEN pg_temp.rint(160, 180) ELSE pg_temp.rint(148, 168) END)::text,
      pwd, pwd_kind, 'N/A',
      pwd AND pwd_kind = 'Visual Disability', false, false, pwd AND pwd_kind = 'Hearing Disability',
      pwd AND pwd_kind = 'Physical Disability', 'N/A',
      '0900' || lpad((1000000 + i)::text, 7, '0'),
      format('Blk %s Lot %s, Purok %s', pg_temp.rint(1, 40), pg_temp.rint(1, 30), pg_temp.pick(puroks)),
      brgy, city, prov, zip,
      status, emp_type, self_type, self_other, unemp_reason, unemp_months, unemp_reason = 'Due to calamity',
      ofw_ctry, CASE WHEN former_ofw THEN pg_temp.pick(ARRAY['End of contract','Employer closure','Family reasons','Contract terminated']) ELSE 'N/A' END,
      false, 'N/A',
      former_ofw, ofw_ctry,
      CASE WHEN former_ofw THEN format('%s/%s', lpad(pg_temp.rint(1, 12)::text, 2, '0'), pg_temp.rint(2019, 2025)) ELSE 'N/A' END,
      is4ps, CASE WHEN is4ps THEN format('1263-%s-%s', pg_temp.rint(1000, 9999), pg_temp.rint(1000, 9999)) ELSE 'N/A' END,
      random() < 0.3, true, cl.occ1, cl.occ2, cl.occ3,
      city, city || CASE WHEN city = 'Koronadal City' OR city LIKE '%City' THEN '' ELSE ', ' || prov END,
      pg_temp.pick(local_prefs), pg_temp.pick(local_prefs),
      pg_temp.pick(overseas_prefs), pg_temp.pick(overseas_prefs), pg_temp.pick(overseas_prefs), pg_temp.pick(overseas_prefs),
      -- "Others" makes the profile form show the typed skill list (other_skills_others).
      to_jsonb(CASE WHEN 'Others' = ANY (cl.boxes) THEN cl.boxes ELSE cl.boxes || 'Others'::text END),
      array_to_string(skills_pick, ', '),
      'NSRP-' || (20261000 + i)::text, '/peso-gsc-logo.png', true, 100, true,
      created, created, 100, seeking, created, 'development-synthetic-data-only-pending-peso-msu-approval'
    ) RETURNING id INTO jid;

    -- Education: secondary for everyone, plus vocational or college where the cluster needs it.
    INSERT INTO public.jobseeker_education (jobseeker_id, currently_in_school, level, course, school_name, year_graduated, level_reached, year_last_attended, secondary_type, senior_high_strand, created_at)
    VALUES (jid, false, 'High School',
            CASE WHEN hs_year >= 2018 THEN 'Senior High School – ' || cl.strand ELSE 'Secondary Education (pre-K to 12 curriculum)' END,
            pg_temp.pick(high_schools), hs_year::text, 'High School Graduate', hs_year::text,
            pg_temp.pick(ARRAY['Public','Public','Private']),
            CASE WHEN hs_year >= 2018 THEN cl.strand ELSE 'Not applicable (graduated before Senior High School)' END,
            created);
    IF edu_level IN ('College', 'Vocational') THEN
      INSERT INTO public.jobseeker_education (jobseeker_id, currently_in_school, level, course, school_name, year_graduated, level_reached, year_last_attended, secondary_type, senior_high_strand, created_at)
      VALUES (jid, false, edu_level, pg_temp.pick(cl.courses),
              pg_temp.pick(CASE WHEN edu_level = 'College' THEN colleges ELSE voc_schools END),
              grad_year::text, CASE WHEN edu_level = 'College' THEN 'College Graduate' ELSE 'Vocational Graduate' END, grad_year::text,
              'Not applicable (tertiary level)', 'Not applicable (tertiary level)', created);
    END IF;

    -- Work experience (new graduates list their on-the-job training).
    IF new_grad THEN
      INSERT INTO public.jobseeker_experience (jobseeker_id, company_name, address, position, number_of_months, status, responsibilities, created_at)
      VALUES (jid, pg_temp.pick(cl.companies), city || ', ' || prov, 'On-the-Job Trainee – ' || cl.occ1, 3, 'Internship',
              'Completed supervised on-the-job training: ' || lower(cl.resp), created);
    ELSE
      n_exp := 1 + (random() < 0.6)::int;
      FOR k IN 1..n_exp LOOP
        INSERT INTO public.jobseeker_experience (jobseeker_id, company_name, address, position, number_of_months, status, responsibilities, created_at)
        VALUES (jid, pg_temp.pick(cl.companies), pg_temp.pick(local_prefs), pg_temp.pick(cl.positions), pg_temp.rint(6, 60),
                pg_temp.pick(ARRAY['Permanent','Contractual','Probationary','Seasonal']), cl.resp, created);
      END LOOP;
    END IF;

    -- Languages / dialects
    INSERT INTO public.jobseeker_languages (jobseeker_id, language, read, write, speak, understand, created_at) VALUES
      (jid, 'Filipino', true, true, true, true, created),
      (jid, 'English', true, true, random() < 0.8, true, created),
      (jid, pg_temp.pick(ARRAY['Cebuano','Cebuano','Hiligaynon']), true, random() < 0.7, true, true, created);
    IF muslim THEN
      INSERT INTO public.jobseeker_languages (jobseeker_id, language, read, write, speak, understand, created_at)
      VALUES (jid, pg_temp.pick(ARRAY['Maguindanaon','Maranao','Tausug']), random() < 0.6, random() < 0.5, true, true, created);
    END IF;

    -- Eligibility / professional license
    INSERT INTO public.jobseeker_licenses (jobseeker_id, eligibility, date_taken, professional_license, valid_until, created_at)
    VALUES (jid, cl.elig, (current_date - pg_temp.rint(200, 1400))::date, cl.prof,
            (current_date + pg_temp.rint(200, 1500))::date, created);

    -- Trainings
    INSERT INTO public.jobseeker_trainings (jobseeker_id, course, hours_of_training, training_institution, skills_acquired, certificates_received, created_at)
    VALUES (jid, cl.tcourse, cl.thours, cl.tinst, cl.tskills, 'Certificate of Competency – ' || cl.tcourse, created);
    IF random() < 0.5 THEN
      INSERT INTO public.jobseeker_trainings (jobseeker_id, course, hours_of_training, training_institution, skills_acquired, certificates_received, created_at)
      VALUES (jid, 'Workplace Safety and Health Orientation', 8, 'DOLE Regional Office XII', 'Workplace Safety, Hazard Identification', 'Certificate of Completion', created);
    END IF;
  END LOOP;
END $seed$;

-- Random picks can give a middle name equal to the last name; replace those.
UPDATE public.jobseekers s
SET middle_name = CASE WHEN s.last_name IN ('Abdullah','Ali','Usman','Abubakar','Kamid','Guiamal','Mangelen','Sangki','Taha','Salik','Musa','Ibrahim')
                       THEN (ARRAY['Sangki','Taha','Salik','Musa','Ibrahim','Kamid'])[1 + (abs(hashtext(s.id::text)) % 6)]
                       ELSE (ARRAY['Bautista','Ramos','Navarro','Pascual','Domingo','Robles'])[1 + (abs(hashtext(s.id::text)) % 6)] END
WHERE s.email LIKE '%@demo.gensanworks.test' AND s.middle_name = s.last_name;

-- Summary
SELECT
  (SELECT count(*) FROM public.employers WHERE email LIKE '%@demo.gensanworks.test') AS employers,
  (SELECT count(*) FROM public.jobs j JOIN public.employers e ON e.id = j.employer_id WHERE e.email LIKE '%@demo.gensanworks.test') AS jobs,
  (SELECT count(*) FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test') AS jobseekers,
  (SELECT count(*) FROM public.jobseeker_education ed JOIN public.jobseekers s ON s.id = ed.jobseeker_id WHERE s.email LIKE '%@demo.gensanworks.test') AS education_rows,
  (SELECT count(*) FROM public.jobseeker_experience x JOIN public.jobseekers s ON s.id = x.jobseeker_id WHERE s.email LIKE '%@demo.gensanworks.test') AS experience_rows,
  (SELECT count(*) FROM public.jobseeker_languages l JOIN public.jobseekers s ON s.id = l.jobseeker_id WHERE s.email LIKE '%@demo.gensanworks.test') AS language_rows,
  (SELECT count(*) FROM public.jobseeker_licenses l JOIN public.jobseekers s ON s.id = l.jobseeker_id WHERE s.email LIKE '%@demo.gensanworks.test') AS license_rows,
  (SELECT count(*) FROM public.jobseeker_trainings t JOIN public.jobseekers s ON s.id = t.jobseeker_id WHERE s.email LIKE '%@demo.gensanworks.test') AS training_rows;
