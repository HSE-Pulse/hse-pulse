# Privacy and Compliance Guide

## Overview

This document outlines the privacy, security, and compliance requirements for the Healthcare ML Portfolio. All projects handle sensitive clinical data and must adhere to strict data protection standards.

## Regulatory Framework

### GDPR Compliance (EU)
- **Lawful Basis**: Ensure valid legal basis for processing health data (Art. 6 & 9)
- **Data Minimization**: Only collect data necessary for the specific purpose
- **Purpose Limitation**: Use data only for stated research/clinical purposes
- **Storage Limitation**: Retain data only as long as necessary
- **Data Subject Rights**: Support access, rectification, erasure requests

### HIPAA Considerations (US)
- Implement technical safeguards for PHI
- Maintain audit logs for data access
- Encrypt data at rest and in transit
- Execute Business Associate Agreements where applicable

### Irish Health Service Executive (HSE) Guidelines
- Follow HSE data protection policies
- Comply with Irish Data Protection Act 2018
- Adhere to health sector specific guidance

---

## Data Anonymization Checklist

### Before Any Public Demo or Sharing

- [ ] **Remove Direct Identifiers**
  - Patient names
  - Medical record numbers (MRN)
  - Social Security / PPS numbers
  - Addresses (street, city if population < 20,000)
  - Phone numbers, fax numbers
  - Email addresses
  - IP addresses
  - Biometric identifiers
  - Full face photographs

- [ ] **Generalize Quasi-Identifiers**
  - Dates: Use year only, or age ranges
  - Geographic: Use region codes, not specific locations
  - Age: Use 5-10 year brackets for ages > 89
  - Rare conditions: Aggregate or suppress

- [ ] **Apply k-Anonymity**
  - Ensure each record matches at least k-1 other records
  - Recommended: k >= 5 for health data

- [ ] **Verify De-identification**
  - Run re-identification risk assessment
  - Document Safe Harbor or Expert Determination method used

### Code Review Checklist

- [ ] No hardcoded credentials or connection strings
- [ ] No PHI in log files or error messages
- [ ] No real patient data in test fixtures
- [ ] No PHI in comments or documentation
- [ ] Environment variables used for sensitive config

---

## Data Handling by Project

### PulseFlow (Patient Flow Prediction)
- **Data Used**: Aggregated trolley counts, hospital statistics
- **PHI Risk**: LOW - Uses aggregate metrics only
- **Anonymization**: Data already anonymized at source (HSE Trolley Watch)
- **Demo Data**: Synthetic hospital capacity data

### CarePlanPlus (Pathway Recommender)
- **Data Used**: Diagnosis codes, procedure sequences, demographics
- **PHI Risk**: MEDIUM - Uses clinical coding data
- **Anonymization Required**:
  - Remove admission IDs, patient IDs
  - Generalize dates to year only
  - Suppress rare diagnosis combinations
- **Demo Data**: Synthetic patient pathways with ICD codes

### PulseNotes (Clinical NLP)
- **Data Used**: Clinical notes, discharge summaries
- **PHI Risk**: HIGH - Free-text contains extensive PHI
- **Anonymization Required**:
  - Use de-identification tools (Philter, Scrubber)
  - Replace names, dates, locations with placeholders
  - Review output for residual identifiers
- **Demo Data**: Publicly available synthetic notes or MIMIC-III (with access)

### MediSync (RL Resource Allocation)
- **Data Used**: Hospital resource metrics, patient volumes
- **PHI Risk**: LOW - Uses operational metrics only
- **Anonymization**: Aggregate to department/hour level minimum
- **Demo Data**: Synthetic hospital scenarios

---

## Data Retention Policy

| Data Type | Retention Period | Disposal Method |
|-----------|------------------|-----------------|
| Training Data (anonymized) | Duration of project + 2 years | Secure deletion |
| Model Artifacts | Until superseded + 1 year | Archive or delete |
| Inference Logs | 90 days | Automatic rotation |
| Audit Logs | 7 years | Secure archive |
| Demo/Test Data | No PHI - retain as needed | Standard deletion |

---

## Security Controls

### Infrastructure
- [ ] All services run in private network (backend_net)
- [ ] Only nginx exposed to public internet
- [ ] TLS 1.2+ enforced for all external connections
- [ ] Secrets stored in environment variables / secret manager
- [ ] No secrets in version control

### Application
- [ ] Input validation on all endpoints
- [ ] Rate limiting enabled (10 req/s default)
- [ ] CORS configured appropriately
- [ ] Security headers set (X-Frame-Options, CSP, etc.)
- [ ] Dependencies regularly updated

### Monitoring
- [ ] Access logs retained and reviewed
- [ ] Failed authentication attempts logged
- [ ] Anomaly detection for unusual patterns
- [ ] Incident response plan documented

---

## Incident Response

### Data Breach Procedure
1. **Contain**: Isolate affected systems immediately
2. **Assess**: Determine scope and data involved
3. **Notify**:
   - Internal stakeholders within 24 hours
   - Data Protection Officer within 48 hours
   - Supervisory authority within 72 hours (if required)
   - Affected individuals without undue delay (if high risk)
4. **Document**: Record all actions taken
5. **Remediate**: Fix vulnerability, update controls
6. **Review**: Post-incident analysis and improvements

### Contact Information
- Data Protection Officer: [DPO contact]
- Security Team: [security contact]
- HSE Data Protection: dataprotection@hse.ie

---

## Third-Party Services

| Service | Purpose | Data Shared | DPA Required |
|---------|---------|-------------|--------------|
| Docker Hub | Container registry | None | No |
| GitHub | Code repository | Code only | No |
| GCP | Hosting | Anonymized only | Yes |
| MongoDB Atlas | Database (if used) | Depends on data | Yes |

---

## Audit Log

Maintain records of:
- Who accessed what data
- When access occurred
- What actions were taken
- Data exports or sharing events

Example log format:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "user": "researcher_id",
  "action": "query",
  "resource": "pulseflow/predict",
  "data_accessed": "anonymized_trolley_data",
  "ip_address": "[hashed]"
}
```

---

## Compliance Attestation

Before deployment, confirm:

- [ ] Data Protection Impact Assessment (DPIA) completed
- [ ] Anonymization procedures documented and followed
- [ ] Security controls implemented and tested
- [ ] Staff trained on data protection requirements
- [ ] Incident response plan in place
- [ ] Third-party agreements executed
- [ ] Retention schedules configured
- [ ] Audit logging enabled

**Signed off by**: ____________________
**Date**: ____________________
**Role**: ____________________

---

## References

- GDPR: https://gdpr.eu/
- HIPAA: https://www.hhs.gov/hipaa/
- HSE Data Protection: https://www.hse.ie/eng/gdpr/
- MIMIC PhysioNet: https://physionet.org/
- OWASP Healthcare Security: https://owasp.org/www-project-web-security-testing-guide/
