// MongoDB Initialization Script for Healthcare ML Portfolio
// Creates unified database with collections for all services

print("=== Initializing Healthcare ML Portfolio Database ===");

// Use the healthcare database
db = db.getSiblingDB('healthcare');

// =============================================================================
// Collection: hospitals - Reference data for all services
// =============================================================================
print("Creating hospitals collection...");
db.createCollection('hospitals');
db.hospitals.createIndex({ "hospital_code": 1 }, { unique: true });

db.hospitals.insertMany([
    {
        hospital_code: "CUH",
        name: "Cork University Hospital",
        full_name: "Cork University Hospital",
        region: "South",
        hse_area: "HSE South",
        beds_total: 800,
        ed_capacity: 55,
        icu_beds: 24,
        location: { city: "Cork", county: "Cork" }
    },
    {
        hospital_code: "MUH",
        name: "Mater Misericordiae University Hospital",
        full_name: "Mater Misericordiae University Hospital",
        region: "Dublin North",
        hse_area: "HSE Dublin North East",
        beds_total: 580,
        ed_capacity: 48,
        icu_beds: 20,
        location: { city: "Dublin", county: "Dublin" }
    },
    {
        hospital_code: "TUH",
        name: "Tallaght University Hospital",
        full_name: "Tallaght University Hospital",
        region: "Dublin South West",
        hse_area: "HSE Dublin Mid-Leinster",
        beds_total: 450,
        ed_capacity: 38,
        icu_beds: 14,
        location: { city: "Dublin", county: "Dublin" }
    }
]);

print("Inserted " + db.hospitals.countDocuments() + " hospitals");

// =============================================================================
// Collection: trolley_counts - PulseFlow service data
// =============================================================================
print("Creating trolley_counts collection for PulseFlow...");
db.createCollection('trolley_counts');
db.trolley_counts.createIndex({ "date": 1, "hospital_code": 1 });
db.trolley_counts.createIndex({ "hospital_code": 1 });
db.trolley_counts.createIndex({ "date": -1 });

// Generate 90 days of synthetic trolley data
var hospitals = ["CUH", "MUH", "TUH"];
var baseValues = { "CUH": 45, "MUH": 42, "TUH": 32 };
var trolleyData = [];

for (var d = 0; d < 90; d++) {
    var date = new Date();
    date.setDate(date.getDate() - (90 - d));
    date.setHours(8, 0, 0, 0);

    var dayOfWeek = date.getDay();
    var month = date.getMonth();

    hospitals.forEach(function(hospital) {
        var base = baseValues[hospital];

        // Weekly pattern
        var weeklyFactor = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1.2 : 0.85;

        // Seasonal pattern (higher in winter months)
        var seasonalFactor = (month >= 10 || month <= 1) ? 1.3 : ((month >= 5 && month <= 7) ? 0.85 : 1.0);

        // Random variation
        var randomFactor = 0.9 + Math.random() * 0.2;

        var trolleys = Math.round(base * weeklyFactor * seasonalFactor * randomFactor);
        var admissions = Math.round(trolleys * 0.6 + (Math.random() * 10 - 5));
        var discharges = Math.round(admissions * 0.85 + (Math.random() * 5 - 2.5));

        trolleyData.push({
            date: date,
            hospital_code: hospital,
            day_of_week: dayOfWeek,
            month: month + 1,
            trolley_count: Math.max(0, trolleys),
            trolleys_gt_9hrs: Math.max(0, Math.round(trolleys * 0.4)),
            trolleys_gt_24hrs: Math.max(0, Math.round(trolleys * 0.15)),
            elderly_waiting: Math.max(0, Math.round(trolleys * 0.25)),
            admissions: Math.max(0, admissions),
            discharges: Math.max(0, discharges),
            bed_occupancy_rate: Math.min(100, Math.round(75 + Math.random() * 20)),
            ed_attendances: Math.round(150 + Math.random() * 100)
        });
    });
}

db.trolley_counts.insertMany(trolleyData);
print("Inserted " + db.trolley_counts.countDocuments() + " trolley count records");

// =============================================================================
// Collection: patients - Shared patient reference
// NOTE: These 8 seed patients are kept for backward compatibility.
// The PulseNotes backend auto-syncs all ~215 patients from clinical_notes
// on startup, so any subject_id present in clinical_notes will be added
// automatically with generated demographics if not already here.
// =============================================================================
print("Creating patients collection...");
db.createCollection('patients');
db.patients.createIndex({ "subject_id": 1 }, { unique: true });
db.patients.createIndex({ "mrn": 1 });

db.patients.insertMany([
    { subject_id: 10188106, mrn: "MRN-2024-001", gender: "M", age: 65, blood_type: "A+", insurance: "Medical Card" },
    { subject_id: 10245789, mrn: "MRN-2024-002", gender: "F", age: 72, blood_type: "O+", insurance: "Private" },
    { subject_id: 10312456, mrn: "MRN-2024-003", gender: "M", age: 45, blood_type: "B+", insurance: "Medical Card" },
    { subject_id: 10456123, mrn: "MRN-2024-004", gender: "F", age: 78, blood_type: "AB-", insurance: "Medical Card" },
    { subject_id: 10523890, mrn: "MRN-2024-005", gender: "M", age: 58, blood_type: "O-", insurance: "Private" },
    { subject_id: 10634567, mrn: "MRN-2024-006", gender: "F", age: 34, blood_type: "A-", insurance: "Private" },
    { subject_id: 10745234, mrn: "MRN-2024-007", gender: "M", age: 82, blood_type: "B-", insurance: "Medical Card" },
    { subject_id: 10856901, mrn: "MRN-2024-008", gender: "F", age: 29, blood_type: "O+", insurance: "Private" }
]);

print("Inserted " + db.patients.countDocuments() + " patients");

// =============================================================================
// Collection: clinical_notes - PulseNotes service data
// =============================================================================
print("Creating clinical_notes collection for PulseNotes...");
db.createCollection('clinical_notes');
db.clinical_notes.createIndex({ "subject_id": 1 });
db.clinical_notes.createIndex({ "hadm_id": 1 });
db.clinical_notes.createIndex({ "note_type": 1 });
db.clinical_notes.createIndex({ "category": 1 });

db.clinical_notes.insertMany([
    {
        note_id: 1,
        subject_id: 10188106,
        hadm_id: 20001234,
        note_type: "Admission Note",
        category: "Cardiology",
        hospital_code: "CUH",
        chartdate: new Date("2024-01-15"),
        text: "Chief Complaint: Chest pain and shortness of breath\n\nHistory of Present Illness: 65 year old male presenting with 3 days of worsening chest pain, radiating to left arm. Associated with diaphoresis and nausea. Pain described as pressure-like, 8/10 severity.\n\nPast Medical History: Hypertension (10 years), Type 2 Diabetes Mellitus (5 years), Hyperlipidemia\n\nMedications: Metformin 1000mg BID, Lisinopril 20mg daily, Atorvastatin 40mg daily\n\nAllergies: NKDA\n\nSocial History: Former smoker (quit 5 years ago, 20 pack-year history). Occasional alcohol. Retired teacher.\n\nFamily History: Father died of MI at age 62. Mother has hypertension.\n\nPhysical Exam: BP 158/92, HR 98, RR 20, SpO2 94% on RA, Temp 36.8C\nGeneral: Alert, anxious, mild distress\nCardiac: S1S2 regular, no murmurs, rubs or gallops\nLungs: Clear to auscultation bilaterally\nAbdomen: Soft, non-tender\nExtremities: No edema, pulses 2+ throughout\n\nAssessment: Acute coronary syndrome, rule out STEMI\n\nPlan:\n1. Serial troponins q6h\n2. Continuous ECG monitoring\n3. Cardiology consult\n4. Consider cardiac catheterization if troponins positive\n5. Aspirin 325mg, Heparin drip, Continue home medications"
    },
    {
        note_id: 2,
        subject_id: 10188106,
        hadm_id: 20001234,
        note_type: "Discharge Summary",
        category: "Cardiology",
        hospital_code: "CUH",
        chartdate: new Date("2024-01-19"),
        text: "Discharge Summary\n\nPatient: 65 year old male\nAdmission Date: 2024-01-15\nDischarge Date: 2024-01-19\n\nDischarge Diagnosis:\n1. Non-ST elevation myocardial infarction (NSTEMI)\n2. Coronary artery disease - 80% LAD stenosis\n3. Hypertension\n4. Type 2 Diabetes Mellitus\n\nHospital Course: Patient admitted with chest pain and elevated troponins (peak 2.4 ng/mL). ECG showed ST depression in V3-V6. Underwent cardiac catheterization on hospital day 2 showing 80% LAD stenosis. Successfully treated with drug-eluting stent placement. Post-procedure course uncomplicated. Cardiac rehabilitation consult completed.\n\nDischarge Medications:\n1. Aspirin 81mg daily (indefinite)\n2. Clopidogrel 75mg daily (12 months minimum)\n3. Metoprolol succinate 50mg BID\n4. Atorvastatin 80mg daily\n5. Lisinopril 20mg daily\n6. Metformin 1000mg BID\n\nDischarge Instructions:\n- Follow up with Cardiology in 1 week\n- Continue dual antiplatelet therapy - do not stop without consulting cardiologist\n- Cardiac rehabilitation program enrollment\n- Low sodium, heart-healthy diet\n- Gradual return to activity\n- Call 999 or return to ED if chest pain recurs"
    },
    {
        note_id: 3,
        subject_id: 10245789,
        hadm_id: 20005678,
        note_type: "Admission Note",
        category: "Pulmonology",
        hospital_code: "UHK",
        chartdate: new Date("2024-01-20"),
        text: "Chief Complaint: Fever and productive cough for 5 days\n\nHistory of Present Illness: 72 year old female with history of COPD presenting with worsening productive cough with yellow-green sputum for 5 days. Associated fever up to 38.9C and increasing dyspnea. Baseline oxygen requirement 2L NC at home, now requiring 4L to maintain SpO2 > 90%.\n\nPast Medical History: COPD (GOLD Stage III), CHF (EF 35%), Atrial fibrillation on anticoagulation, Osteoporosis\n\nMedications: Albuterol inhaler PRN, Tiotropium 18mcg daily, Metoprolol 50mg BID, Warfarin 5mg daily, Alendronate weekly\n\nAllergies: Penicillin - rash\n\nPhysical Exam: BP 132/78, HR 88 irregular, RR 24, SpO2 88% on RA (94% on 4L NC), Temp 38.5C\nGeneral: Elderly female in mild respiratory distress\nLungs: Bilateral rhonchi and scattered wheezes, decreased breath sounds at bases\nCardiac: Irregularly irregular rhythm, no murmurs\nExtremities: 1+ bilateral pedal edema\n\nLabs: WBC 14.2, CRP 85, Procalcitonin 0.8\nChest X-ray: Right lower lobe infiltrate, no pleural effusion\n\nAssessment: \n1. COPD exacerbation with community-acquired pneumonia\n2. Acute hypoxic respiratory failure\n\nPlan:\n1. Supplemental O2 to maintain SpO2 > 92%\n2. Nebulized bronchodilators q4h\n3. IV methylprednisolone 125mg daily\n4. Azithromycin 500mg daily (PCN allergy)\n5. Monitor INR - hold warfarin temporarily\n6. DVT prophylaxis with compression devices"
    },
    {
        note_id: 4,
        subject_id: 10312456,
        hadm_id: 20009012,
        note_type: "ED Note",
        category: "Surgery",
        hospital_code: "UHG",
        chartdate: new Date("2024-01-22"),
        text: "Chief Complaint: Abdominal pain and vomiting\n\nHistory of Present Illness: 45 year old male presenting with acute onset RLQ abdominal pain for 12 hours. Pain started periumbilical and migrated to RLQ over 6 hours. Associated with nausea, 3 episodes of vomiting, and anorexia. Denies diarrhea, constipation, or urinary symptoms. No recent travel or sick contacts.\n\nPast Medical History: Appendectomy age 12 (reportedly incomplete/interval appendectomy), Obesity (BMI 34), GERD\n\nMedications: Omeprazole 20mg daily PRN\n\nAllergies: Sulfa drugs - hives\n\nPhysical Exam: BP 128/82, HR 102, RR 18, SpO2 99% RA, Temp 38.2C\nGeneral: Alert, uncomfortable, lying still\nAbdomen: Soft, RLQ tenderness with guarding, positive McBurney's point tenderness, positive Rovsing's sign, no rebound in LLQ\nRectal: Normal tone, no masses, hemoccult negative\n\nLabs: WBC 15.8 (left shift), CRP 95\nCT Abdomen/Pelvis: Dilated appendix (12mm) with periappendiceal fat stranding, no perforation or abscess\n\nAssessment: Acute appendicitis (possible stump appendicitis given prior incomplete appendectomy)\n\nPlan:\n1. NPO, IV fluids\n2. Surgical consult for appendectomy\n3. IV Ceftriaxone/Metronidazole (avoiding sulfa)\n4. Admit to surgical service"
    },
    {
        note_id: 5,
        subject_id: 10456123,
        hadm_id: 20003456,
        note_type: "Admission Note",
        category: "Geriatrics",
        hospital_code: "SVH",
        chartdate: new Date("2024-01-25"),
        text: "Chief Complaint: Confusion and lethargy\n\nHistory of Present Illness: 78 year old female brought in by family for 2 days of increasing confusion, decreased oral intake, and new urinary incontinence. Family reports she was at baseline (mild dementia, MMSE 22/30) until 2 days ago when she became increasingly disoriented, not recognizing family members. Also noted decreased appetite and low-grade fever at home.\n\nPast Medical History: Alzheimer's dementia (diagnosed 3 years ago), Recurrent UTIs (3 in past year), Hypothyroidism, Osteoarthritis, Falls (2 in past 6 months)\n\nMedications: Donepezil 10mg daily, Levothyroxine 50mcg daily, Paracetamol PRN\n\nAllergies: NKDA\n\nSocial: Lives with daughter, uses walker for ambulation, needs assistance with ADLs\n\nPhysical Exam: BP 100/60, HR 92, RR 18, SpO2 96% RA, Temp 38.5C\nGeneral: Elderly female, drowsy but arousable, disoriented to time and place\nNeuro: GCS 14 (E4V4M6), no focal deficits, MMSE not reliable given acute confusion\nAbdomen: Soft, suprapubic tenderness, no CVA tenderness\nSkin: No pressure ulcers, skin turgor slightly decreased\n\nLabs: WBC 12.4, Cr 1.4 (baseline 1.0), UA positive for leukocyte esterase and nitrites\nCT Head: No acute intracranial abnormality, stable chronic microvascular changes\n\nAssessment:\n1. Delirium secondary to urinary tract infection\n2. Acute kidney injury (likely prerenal from dehydration)\n3. Alzheimer's dementia - baseline\n\nPlan:\n1. IV fluids for rehydration\n2. Urine culture pending, empiric Ciprofloxacin 500mg BID\n3. Delirium precautions, minimize sedatives\n4. PT/OT evaluation\n5. Family meeting regarding goals of care"
    },
    {
        note_id: 6,
        subject_id: 10523890,
        hadm_id: 20007890,
        note_type: "Admission Note",
        category: "Gastroenterology",
        hospital_code: "MUH",
        chartdate: new Date("2024-01-26"),
        text: "Chief Complaint: Hematemesis and melena\n\nHistory of Present Illness: 58 year old male presenting with 2 episodes of coffee-ground emesis and black tarry stools for 1 day. Reports epigastric discomfort for past 2 weeks. Takes ibuprofen regularly for back pain. Denies alcohol use. Reports lightheadedness when standing.\n\nPast Medical History: Chronic low back pain, Hypertension, H. pylori (treated 5 years ago)\n\nMedications: Ibuprofen 400mg TID, Amlodipine 5mg daily\n\nAllergies: NKDA\n\nPhysical Exam: BP 95/60 (supine), 80/50 (standing), HR 110, RR 16, SpO2 98% RA\nGeneral: Pale, diaphoretic, anxious\nAbdomen: Soft, epigastric tenderness, no peritoneal signs\nRectal: Black, tarry stool, guaiac positive\n\nLabs: Hgb 7.2 (baseline 14), BUN 42, Cr 1.1, INR 1.0, Platelets 220\n\nAssessment: Upper GI bleed, likely NSAID-induced peptic ulcer disease\n\nPlan:\n1. 2 units pRBC transfusion\n2. IV PPI (Pantoprazole 80mg bolus, then 8mg/hr drip)\n3. NPO, IV fluids\n4. Urgent GI consult for EGD\n5. Hold NSAIDs permanently\n6. Type and screen, crossmatch 4 units"
    },
    {
        note_id: 7,
        subject_id: 10634567,
        hadm_id: 20008901,
        note_type: "Admission Note",
        category: "Obstetrics",
        hospital_code: "TUH",
        chartdate: new Date("2024-01-27"),
        text: "Chief Complaint: Severe headache and elevated blood pressure at 34 weeks gestation\n\nHistory of Present Illness: 34 year old G2P1 at 34+2 weeks gestation presenting with severe frontal headache for 6 hours, associated with visual changes (seeing spots). BP at GP office was 165/105. Reports mild RUQ discomfort. Denies vaginal bleeding, leaking fluid, or decreased fetal movement.\n\nObstetric History: G2P1001 - one prior uncomplicated SVD at term\n\nPast Medical History: None\n\nMedications: Prenatal vitamins\n\nAllergies: NKDA\n\nPhysical Exam: BP 168/108, HR 88, RR 16, SpO2 99% RA\nGeneral: Alert, anxious, mild distress from headache\nAbdomen: Gravid, fundal height appropriate, FHR 145 with good variability\nExtremities: 2+ bilateral pedal edema, 3+ patellar reflexes with clonus\n\nLabs: Platelets 98, AST 95, ALT 88, Creatinine 1.0, Uric acid 7.2\nUrinalysis: 3+ protein\n\nAssessment: Severe preeclampsia at 34 weeks\n\nPlan:\n1. Magnesium sulfate for seizure prophylaxis\n2. IV Labetalol for BP control (goal < 160/110)\n3. Betamethasone for fetal lung maturity\n4. Continuous fetal monitoring\n5. Obstetric team - plan for delivery within 24-48 hours\n6. NICU notified"
    },
    {
        note_id: 8,
        subject_id: 10745234,
        hadm_id: 20009234,
        note_type: "Admission Note",
        category: "Orthopedics",
        hospital_code: "UHL",
        chartdate: new Date("2024-01-27"),
        text: "Chief Complaint: Left hip pain after fall\n\nHistory of Present Illness: 82 year old male presenting after mechanical fall at home this morning. Was getting out of bed, felt dizzy, and fell onto left side. Unable to bear weight since. Denies LOC, head strike, or chest pain. Reports recent fatigue and decreased appetite for 2 weeks.\n\nPast Medical History: Atrial fibrillation, Type 2 Diabetes, Benign prostatic hyperplasia, Osteoporosis (on treatment)\n\nMedications: Apixaban 5mg BID, Metformin 500mg BID, Tamsulosin 0.4mg daily, Alendronate 70mg weekly, Vitamin D\n\nAllergies: Codeine - nausea\n\nPhysical Exam: BP 135/80, HR 78 irregular, RR 14, SpO2 97% RA\nGeneral: Elderly male in pain, but alert and oriented\nLeft hip: Shortened and externally rotated leg, unable to perform SLR\nNeurovascular: Distal pulses intact, sensation intact\n\nX-ray Left Hip: Displaced intracapsular femoral neck fracture\n\nAssessment: Left femoral neck fracture (Garden IV)\n\nPlan:\n1. Pain management (avoid codeine)\n2. Hold Apixaban - plan for surgery\n3. Orthopedic consultation for hemiarthroplasty vs total hip\n4. Preoperative workup (ECG, chest X-ray, bloods)\n5. Geriatric medicine co-management\n6. VTE prophylaxis post-op\n7. Fall risk assessment and PT evaluation"
    }
]);

print("Inserted " + db.clinical_notes.countDocuments() + " clinical notes");

// =============================================================================
// Collection: diagnoses - CarePlanPlus service data
// =============================================================================
print("Creating diagnoses collection for CarePlanPlus...");
db.createCollection('diagnoses');
db.diagnoses.createIndex({ "subject_id": 1 });
db.diagnoses.createIndex({ "hadm_id": 1 });
db.diagnoses.createIndex({ "icd_code": 1 });

db.diagnoses.insertMany([
    { subject_id: 10188106, hadm_id: 20001234, seq_num: 1, icd_code: "I21.4", icd_version: 10, description: "Non-ST elevation myocardial infarction" },
    { subject_id: 10188106, hadm_id: 20001234, seq_num: 2, icd_code: "I25.10", icd_version: 10, description: "Atherosclerotic heart disease of native coronary artery" },
    { subject_id: 10188106, hadm_id: 20001234, seq_num: 3, icd_code: "I10", icd_version: 10, description: "Essential hypertension" },
    { subject_id: 10188106, hadm_id: 20001234, seq_num: 4, icd_code: "E11.9", icd_version: 10, description: "Type 2 diabetes mellitus without complications" },
    { subject_id: 10245789, hadm_id: 20005678, seq_num: 1, icd_code: "J44.1", icd_version: 10, description: "COPD with acute exacerbation" },
    { subject_id: 10245789, hadm_id: 20005678, seq_num: 2, icd_code: "J18.9", icd_version: 10, description: "Pneumonia, unspecified organism" },
    { subject_id: 10245789, hadm_id: 20005678, seq_num: 3, icd_code: "I50.9", icd_version: 10, description: "Heart failure, unspecified" },
    { subject_id: 10245789, hadm_id: 20005678, seq_num: 4, icd_code: "I48.91", icd_version: 10, description: "Unspecified atrial fibrillation" },
    { subject_id: 10312456, hadm_id: 20009012, seq_num: 1, icd_code: "K35.80", icd_version: 10, description: "Unspecified acute appendicitis" },
    { subject_id: 10456123, hadm_id: 20003456, seq_num: 1, icd_code: "N39.0", icd_version: 10, description: "Urinary tract infection, site not specified" },
    { subject_id: 10456123, hadm_id: 20003456, seq_num: 2, icd_code: "F05", icd_version: 10, description: "Delirium due to known physiological condition" },
    { subject_id: 10456123, hadm_id: 20003456, seq_num: 3, icd_code: "G30.9", icd_version: 10, description: "Alzheimer's disease, unspecified" },
    { subject_id: 10523890, hadm_id: 20007890, seq_num: 1, icd_code: "K92.0", icd_version: 10, description: "Hematemesis" },
    { subject_id: 10523890, hadm_id: 20007890, seq_num: 2, icd_code: "K25.4", icd_version: 10, description: "Chronic or unspecified gastric ulcer with hemorrhage" },
    { subject_id: 10634567, hadm_id: 20008901, seq_num: 1, icd_code: "O14.1", icd_version: 10, description: "Severe preeclampsia" },
    { subject_id: 10745234, hadm_id: 20009234, seq_num: 1, icd_code: "S72.001A", icd_version: 10, description: "Fracture of unspecified part of neck of left femur" }
]);

print("Inserted " + db.diagnoses.countDocuments() + " diagnoses");

// =============================================================================
// Collection: procedures - CarePlanPlus service data
// =============================================================================
print("Creating procedures collection for CarePlanPlus...");
db.createCollection('procedures');
db.procedures.createIndex({ "subject_id": 1 });
db.procedures.createIndex({ "hadm_id": 1 });
db.procedures.createIndex({ "icd_code": 1 });

db.procedures.insertMany([
    { subject_id: 10188106, hadm_id: 20001234, seq_num: 1, icd_code: "02703DZ", icd_version: 10, description: "Dilation of Coronary Artery, One Artery with Intraluminal Device, Percutaneous Approach" },
    { subject_id: 10188106, hadm_id: 20001234, seq_num: 2, icd_code: "4A023N7", icd_version: 10, description: "Measurement of Cardiac Sampling and Pressure, Right Heart, Percutaneous Approach" },
    { subject_id: 10245789, hadm_id: 20005678, seq_num: 1, icd_code: "5A1945Z", icd_version: 10, description: "Respiratory Ventilation, 24-96 Consecutive Hours" },
    { subject_id: 10245789, hadm_id: 20005678, seq_num: 2, icd_code: "3E0G76Z", icd_version: 10, description: "Introduction of Nutritional Substance into Upper GI, Via Natural Opening" },
    { subject_id: 10312456, hadm_id: 20009012, seq_num: 1, icd_code: "0DTJ4ZZ", icd_version: 10, description: "Resection of Appendix, Percutaneous Endoscopic Approach" },
    { subject_id: 10456123, hadm_id: 20003456, seq_num: 1, icd_code: "0T9B70Z", icd_version: 10, description: "Drainage of Bladder, Via Natural or Artificial Opening" },
    { subject_id: 10523890, hadm_id: 20007890, seq_num: 1, icd_code: "0DB68ZZ", icd_version: 10, description: "Excision of Stomach, Via Natural or Artificial Opening Endoscopic" },
    { subject_id: 10523890, hadm_id: 20007890, seq_num: 2, icd_code: "30233N1", icd_version: 10, description: "Transfusion of Nonautologous Red Blood Cells into Peripheral Vein, Percutaneous" },
    { subject_id: 10634567, hadm_id: 20008901, seq_num: 1, icd_code: "10D00Z1", icd_version: 10, description: "Extraction of Products of Conception, Low Cervical, Open Approach" },
    { subject_id: 10745234, hadm_id: 20009234, seq_num: 1, icd_code: "0SR9019", icd_version: 10, description: "Replacement of Left Hip Joint with Metal Synthetic Substitute, Cemented, Open Approach" }
]);

print("Inserted " + db.procedures.countDocuments() + " procedures");

// =============================================================================
// Collection: hospital_state - MediSync service data
// =============================================================================
print("Creating hospital_state collection for MediSync...");
db.createCollection('hospital_state');
db.hospital_state.createIndex({ "timestamp": -1 });
db.hospital_state.createIndex({ "hospital_code": 1 });

// Generate current state for each hospital
hospitals.forEach(function(hospitalCode) {
    db.hospital_state.insertOne({
        hospital_code: hospitalCode,
        timestamp: new Date(),
        departments: {
            Emergency: {
                current_patients: Math.round(20 + Math.random() * 30),
                available_beds: Math.round(25 + Math.random() * 15),
                staff_on_duty: Math.round(8 + Math.random() * 8),
                incoming_rate: Math.round(3 + Math.random() * 7),
                severity_index: Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
                wait_time_minutes: Math.round(30 + Math.random() * 90)
            },
            ICU: {
                current_patients: Math.round(12 + Math.random() * 8),
                available_beds: Math.round(15 + Math.random() * 10),
                staff_on_duty: Math.round(10 + Math.random() * 8),
                incoming_rate: Math.round(1 + Math.random() * 3),
                severity_index: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
                ventilators_in_use: Math.round(5 + Math.random() * 5)
            },
            Surgery: {
                current_patients: Math.round(8 + Math.random() * 10),
                available_beds: Math.round(12 + Math.random() * 8),
                staff_on_duty: Math.round(6 + Math.random() * 6),
                incoming_rate: Math.round(2 + Math.random() * 4),
                severity_index: Math.round((0.5 + Math.random() * 0.3) * 100) / 100,
                scheduled_surgeries: Math.round(5 + Math.random() * 10)
            },
            "General Ward": {
                current_patients: Math.round(60 + Math.random() * 40),
                available_beds: Math.round(80 + Math.random() * 40),
                staff_on_duty: Math.round(15 + Math.random() * 10),
                incoming_rate: Math.round(5 + Math.random() * 10),
                severity_index: Math.round((0.2 + Math.random() * 0.3) * 100) / 100,
                discharge_pending: Math.round(5 + Math.random() * 15)
            }
        }
    });
});

print("Inserted " + db.hospital_state.countDocuments() + " hospital state records");

// =============================================================================
// Collection: procedure_mappings - Reference for CarePlanPlus
// =============================================================================
print("Creating procedure_mappings collection...");
db.createCollection('procedure_mappings');
db.procedure_mappings.createIndex({ "code": 1 }, { unique: true });

db.procedure_mappings.insertMany([
    { code: "0BH17ZZ", description: "Insertion of Radioactive Element into Trachea, Via Natural or Artificial Opening", category: "Respiratory" },
    { code: "0BH18ZZ", description: "Insertion of Radioactive Element into Trachea, Via Natural or Artificial Opening Endoscopic", category: "Respiratory" },
    { code: "02HV33Z", description: "Insertion of Infusion Device into Superior Vena Cava, Percutaneous Approach", category: "Cardiovascular" },
    { code: "5A1955Z", description: "Respiratory Ventilation, Greater than 96 Consecutive Hours", category: "Respiratory" },
    { code: "5A1945Z", description: "Respiratory Ventilation, 24-96 Consecutive Hours", category: "Respiratory" },
    { code: "0W9G3ZZ", description: "Drainage of Peritoneal Cavity, Percutaneous Approach", category: "Gastrointestinal" },
    { code: "0BN70ZZ", description: "Release Right Main Bronchus, Open Approach", category: "Respiratory" },
    { code: "0BN74ZZ", description: "Release Right Main Bronchus, Percutaneous Endoscopic Approach", category: "Respiratory" },
    { code: "3E0G76Z", description: "Introduction of Nutritional Substance into Upper GI, Via Natural Opening", category: "Gastrointestinal" },
    { code: "0DB64ZZ", description: "Excision of Stomach, Percutaneous Endoscopic Approach", category: "Gastrointestinal" },
    { code: "02703DZ", description: "Dilation of Coronary Artery, One Artery with Intraluminal Device, Percutaneous Approach", category: "Cardiovascular" },
    { code: "02100Z9", description: "Bypass Coronary Artery, One Artery from Left Internal Mammary, Open Approach", category: "Cardiovascular" },
    { code: "5A1221Z", description: "Performance of Cardiac Output, Continuous", category: "Cardiovascular" },
    { code: "0T9B70Z", description: "Drainage of Bladder, Via Natural or Artificial Opening", category: "Genitourinary" },
    { code: "30233N1", description: "Transfusion of Nonautologous Red Blood Cells into Peripheral Vein, Percutaneous", category: "Transfusion" },
    { code: "0DTJ4ZZ", description: "Resection of Appendix, Percutaneous Endoscopic Approach", category: "Gastrointestinal" },
    { code: "0DB68ZZ", description: "Excision of Stomach, Via Natural or Artificial Opening Endoscopic", category: "Gastrointestinal" },
    { code: "10D00Z1", description: "Extraction of Products of Conception, Low Cervical, Open Approach", category: "Obstetrics" },
    { code: "0SR9019", description: "Replacement of Left Hip Joint with Metal Synthetic Substitute, Cemented, Open Approach", category: "Orthopedics" }
]);

print("Inserted " + db.procedure_mappings.countDocuments() + " procedure mappings");

// =============================================================================
// Summary
// =============================================================================
print("\n=== Database Initialization Complete ===");
print("Database: healthcare");
print("Collections created:");
print("  - hospitals: " + db.hospitals.countDocuments() + " records");
print("  - patients: " + db.patients.countDocuments() + " records");
print("  - trolley_counts: " + db.trolley_counts.countDocuments() + " records (PulseFlow)");
print("  - clinical_notes: " + db.clinical_notes.countDocuments() + " records (PulseNotes)");
print("  - diagnoses: " + db.diagnoses.countDocuments() + " records (CarePlanPlus)");
print("  - procedures: " + db.procedures.countDocuments() + " records (CarePlanPlus)");
print("  - hospital_state: " + db.hospital_state.countDocuments() + " records (MediSync)");
print("  - procedure_mappings: " + db.procedure_mappings.countDocuments() + " records (CarePlanPlus)");
