import os
import json
import pandas as pd
import numpy as np
from app.config import CAREUNIT_MAP, DEPARTMENTS, ADMISSION_ACUITY

def load_json_data(data_dir, max_patients=None):
    admissions_path = os.path.join(data_dir, 'admissions.json')
    transfers_path = os.path.join(data_dir, 'transfers.json')
    patients_path = os.path.join(data_dir, 'patients.json')
    services_path = os.path.join(data_dir, 'services.json')

    with open(admissions_path, 'r') as f:
        admissions = json.load(f)
    with open(transfers_path, 'r') as f:
        transfers = json.load(f)

    patients_df = None
    if os.path.exists(patients_path):
        with open(patients_path, 'r') as f:
            patients_df = pd.DataFrame(json.load(f))

    services_df = None
    if os.path.exists(services_path):
        with open(services_path, 'r') as f:
            services_df = pd.DataFrame(json.load(f))

    admissions_df = pd.DataFrame(admissions)
    transfers_df = pd.DataFrame(transfers)

    pathways = {}
    for _, t in transfers_df.iterrows():
        hadm_id = t['hadm_id']
        careunit = t.get('careunit', '')
        if pd.isna(careunit) or careunit == '':
            continue
        mapped = CAREUNIT_MAP.get(careunit, None)
        if mapped and mapped in DEPARTMENTS:
            if hadm_id not in pathways:
                pathways[hadm_id] = []
            if not pathways[hadm_id] or pathways[hadm_id][-1] != mapped:
                pathways[hadm_id].append(mapped)

    records = []
    for _, adm in admissions_df.iterrows():
        hadm_id = adm['hadm_id']
        if hadm_id not in pathways or len(pathways[hadm_id]) < 2:
            continue

        pathway = pathways[hadm_id]
        if pathway[-1] != 'Discharge Lounge':
            pathway.append('Discharge Lounge')

        admission_type = adm.get('admission_type', 'ELECTIVE')
        base_acuity = ADMISSION_ACUITY.get(admission_type, 0.5)

        has_icu = 'ICU' in pathway
        has_stepdown = 'Stepdown Unit' in pathway
        pathway_complexity = len(pathway) / 10.0

        acuity = base_acuity
        if has_icu:
            acuity = min(1.0, acuity + 0.2)
        if has_stepdown:
            acuity = min(1.0, acuity + 0.1)
        acuity = min(1.0, acuity + pathway_complexity * 0.1)

        records.append({
            'hadm_id': hadm_id,
            'admittime': adm['admittime'],
            'admission_type': admission_type,
            'pathway': pathway,
            'pathway_length': len(pathway),
            'acuity': round(acuity, 2),
        })

    result_df = pd.DataFrame(records)

    if max_patients and len(result_df) > max_patients:
        result_df = result_df.sample(n=max_patients, random_state=42).reset_index(drop=True)

    return result_df

def generate_synthetic_data(n_patients=1000, seed=42):
    np.random.seed(seed)

    records = []
    base_time = pd.Timestamp('2024-01-01 00:00:00')

    for i in range(n_patients):
        hours_offset = np.random.exponential(scale=168/n_patients * (i + 1))
        admittime = base_time + pd.Timedelta(hours=min(hours_offset, 167))

        acuity = np.random.uniform(0.4, 1.0)

        if acuity > 0.8:
            pathway = ['Emergency Department', 'ICU', 'Stepdown Unit', 'Medicine', 'Discharge Lounge']
        elif acuity > 0.6:
            pathway = ['Emergency Department', 'Medicine/Cardiology', 'Discharge Lounge']
        else:
            pathway = ['Emergency Department', 'ED Observation', 'Discharge Lounge']

        if np.random.random() < 0.3:
            insert_idx = np.random.randint(1, len(pathway))
            extra_dept = np.random.choice(['Med/Surg', 'Neurology', 'Stepdown Unit'])
            if extra_dept not in pathway:
                pathway.insert(insert_idx, extra_dept)

        records.append({
            'hadm_id': i + 1,
            'admittime': admittime.strftime('%Y-%m-%dT%H:%M:%S'),
            'admission_type': np.random.choice(['EMERGENCY', 'URGENT', 'ELECTIVE']),
            'pathway': pathway,
            'pathway_length': len(pathway),
            'acuity': round(acuity, 2),
        })

    return pd.DataFrame(records)
