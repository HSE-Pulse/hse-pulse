import { useState, useEffect, useCallback } from 'react'
import { Users, Building2, ClipboardList, Stethoscope, BarChart3, ArrowLeft, Database } from 'lucide-react'
import DataTable from '../components/DataTable'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { api } from '../api/client'
import type { Patient, Admission, DiagnosisIcd, ProcedureIcd, NiesRecord, PatientDetail, PatientAdmissionRecord, PaginatedResponse } from '../types'

type Tab = 'patients' | 'admissions' | 'diagnoses' | 'procedures' | 'nies' | 'training'

const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'patients', label: 'Patients', icon: Users },
  { key: 'admissions', label: 'Admissions', icon: Building2 },
  { key: 'diagnoses', label: 'Diagnoses', icon: ClipboardList },
  { key: 'procedures', label: 'Procedures', icon: Stethoscope },
  { key: 'nies', label: 'NIES', icon: BarChart3 },
  { key: 'training', label: 'Training Data', icon: Database },
]

export default function DataExplorer() {
  const [activeTab, setActiveTab] = useState<Tab>('patients')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedResponse<Record<string, unknown>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null)
  const [selectedTrainingRecord, setSelectedTrainingRecord] = useState<PatientAdmissionRecord | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let result: PaginatedResponse<unknown>
      switch (activeTab) {
        case 'patients':
          result = await api.patients(page, 20)
          break
        case 'admissions':
          result = await api.admissions(undefined, page, 20)
          break
        case 'diagnoses':
          result = await api.diagnoses(undefined, page, 50)
          break
        case 'procedures':
          result = await api.procedures(undefined, page, 50)
          break
        case 'nies':
          result = await api.nies(undefined, page, 50)
          break
        case 'training':
          result = await api.patientAdmissions(undefined, page, 20)
          break
      }
      setData(result as PaginatedResponse<Record<string, unknown>>)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [activeTab, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setPage(1)
    setSelectedPatient(null)
    setSelectedTrainingRecord(null)
  }

  const handlePatientClick = async (row: Record<string, unknown>) => {
    const subjectId = row.subject_id as number
    if (!subjectId) return
    setPatientLoading(true)
    try {
      const detail = await api.patientDetail(subjectId)
      setSelectedPatient(detail)
    } catch {
      setSelectedPatient(null)
    } finally {
      setPatientLoading(false)
    }
  }

  const patientColumns = [
    { key: 'subject_id', header: 'Subject ID', render: (r: Patient) => (
      <span className="font-mono font-bold text-primary-600">{r.subject_id}</span>
    )},
    { key: 'gender', header: 'Gender' },
    { key: 'anchor_age', header: 'Age' },
    { key: 'anchor_year_group', header: 'Year Group' },
  ]

  const admissionColumns = [
    { key: 'hadm_id', header: 'Admission ID', render: (r: Admission) => (
      <span className="font-mono text-xs">{r.hadm_id}</span>
    )},
    { key: 'subject_id', header: 'Patient' },
    { key: 'admission_type', header: 'Type' },
    { key: 'admittime', header: 'Admitted', render: (r: Admission) => (
      <span className="text-xs">{r.admittime?.split(' ')[0]}</span>
    )},
    { key: 'dischtime', header: 'Discharged', render: (r: Admission) => (
      <span className="text-xs">{r.dischtime?.split(' ')[0]}</span>
    )},
    { key: 'insurance', header: 'Insurance' },
  ]

  const diagnosisColumns = [
    { key: 'hadm_id', header: 'Admission ID', render: (r: DiagnosisIcd) => (
      <span className="font-mono text-xs">{r.hadm_id}</span>
    )},
    { key: 'seq_num', header: 'Seq' },
    { key: 'icd_code', header: 'ICD Code', render: (r: DiagnosisIcd) => (
      <span className="font-mono font-bold text-purple-600">{r.icd_code}</span>
    )},
    { key: 'icd_version', header: 'Version' },
  ]

  const procedureColumns = [
    { key: 'hadm_id', header: 'Admission ID', render: (r: ProcedureIcd) => (
      <span className="font-mono text-xs">{r.hadm_id}</span>
    )},
    { key: 'seq_num', header: 'Seq' },
    { key: 'icd_code', header: 'ICD Code', render: (r: ProcedureIcd) => (
      <span className="font-mono font-bold text-amber-600">{r.icd_code}</span>
    )},
    { key: 'icd_version', header: 'Version' },
    { key: 'chartdate', header: 'Date', render: (r: ProcedureIcd) => (
      <span className="text-xs">{r.chartdate ? String(r.chartdate).split('T')[0] : '-'}</span>
    )},
  ]

  const handleTrainingRecordClick = (row: Record<string, unknown>) => {
    setSelectedTrainingRecord(row as unknown as PatientAdmissionRecord)
  }

  const trainingColumns = [
    { key: 'subject_id', header: 'Patient', render: (r: PatientAdmissionRecord) => (
      <span className="font-mono font-bold text-primary-600">{r.subject_id}</span>
    )},
    { key: 'hadm_id', header: 'Admission', render: (r: PatientAdmissionRecord) => (
      <span className="font-mono text-xs">{r.hadm_id}</span>
    )},
    { key: 'gender', header: 'Gender' },
    { key: 'age', header: 'Age' },
    { key: 'diagnoses', header: 'Diagnoses', render: (r: PatientAdmissionRecord) => (
      <span className="text-xs">{r.diagnoses?.length ?? 0}</span>
    )},
    { key: 'procedures', header: 'Procedures', render: (r: PatientAdmissionRecord) => (
      <span className="text-xs">{r.procedures?.length ?? 0}</span>
    )},
    { key: 'admittime', header: 'Admitted', render: (r: PatientAdmissionRecord) => (
      <span className="text-xs">{r.admittime?.split(' ')[0]}</span>
    )},
  ]

  const niesColumns = [
    { key: 'condition_label', header: 'Condition' },
    { key: 'satisfaction_score', header: 'Satisfaction', render: (r: NiesRecord) => (
      <span className="font-semibold">{(r.satisfaction_score * 100).toFixed(1)}%</span>
    )},
    { key: 'agegroup', header: 'Age Group' },
    { key: 'Gender', header: 'Gender', render: (r: NiesRecord) => (
      <span>{r.Gender === 1 ? 'M' : 'F'}</span>
    )},
    { key: 'icd10_from', header: 'ICD10 Range', render: (r: NiesRecord) => (
      <span className="font-mono text-xs">{r.icd10_from}-{r.icd10_to}</span>
    )},
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columnMap: Record<Tab, any[]> = {
    patients: patientColumns,
    admissions: admissionColumns,
    diagnoses: diagnosisColumns,
    procedures: procedureColumns,
    nies: niesColumns,
    training: trainingColumns,
  }

  // Training record detail view
  if (selectedTrainingRecord) {
    const rec = selectedTrainingRecord
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setSelectedTrainingRecord(null)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Training Data
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Patient {rec.subject_id} &mdash; Admission {rec.hadm_id}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Gender</span>
              <p className="font-semibold">{rec.gender}</p>
            </div>
            <div>
              <span className="text-slate-500">Age</span>
              <p className="font-semibold">{rec.age}</p>
            </div>
            <div>
              <span className="text-slate-500">Admitted</span>
              <p className="font-semibold">{rec.admittime?.split(' ')[0]}</p>
            </div>
            <div>
              <span className="text-slate-500">Discharged</span>
              <p className="font-semibold">{rec.dischtime?.split(' ')[0]}</p>
            </div>
            <div>
              <span className="text-slate-500">Records</span>
              <p className="font-semibold">{rec.diagnoses?.length ?? 0} diag / {rec.procedures?.length ?? 0} proc</p>
            </div>
          </div>
        </div>

        {rec.diagnoses && rec.diagnoses.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-3">Diagnoses ({rec.diagnoses.length})</h4>
            <div className="space-y-2">
              {rec.diagnoses.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg text-sm">
                  <span className="font-mono font-bold text-purple-700 w-16 shrink-0">{d.icd_code}</span>
                  <span className="text-slate-700">{d.long_title}</span>
                  <span className="ml-auto text-xs text-slate-400">seq {d.seq_num} &middot; v{d.icd_version}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rec.procedures && rec.procedures.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-3">Procedures ({rec.procedures.length})</h4>
            <div className="space-y-2">
              {rec.procedures.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg text-sm">
                  <span className="font-mono font-bold text-amber-700 w-20 shrink-0">{p.icd_code}</span>
                  <span className="text-slate-700">{p.long_title}</span>
                  <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">
                    seq {p.seq_num} &middot; v{p.icd_version}
                    {p.chartdate && <> &middot; {String(p.chartdate).split('T')[0]}</>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Patient detail view
  if (selectedPatient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setSelectedPatient(null)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Patient {selectedPatient.subject_id}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Gender</span>
              <p className="font-semibold">{selectedPatient.gender}</p>
            </div>
            <div>
              <span className="text-slate-500">Age</span>
              <p className="font-semibold">{selectedPatient.anchor_age}</p>
            </div>
            <div>
              <span className="text-slate-500">Admissions</span>
              <p className="font-semibold">{selectedPatient.admissions.length}</p>
            </div>
            <div>
              <span className="text-slate-500">Diagnoses</span>
              <p className="font-semibold">{selectedPatient.diagnoses.length}</p>
            </div>
          </div>
        </div>

        {selectedPatient.admissions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-3">Admissions ({selectedPatient.admissions.length})</h4>
            <div className="space-y-2">
              {selectedPatient.admissions.map((a) => (
                <div key={a.hadm_id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg text-sm">
                  <span className="font-mono font-bold text-primary-600">{a.hadm_id}</span>
                  <span className="text-slate-600">{a.admission_type}</span>
                  <span className="text-xs text-slate-400">{a.admittime?.split(' ')[0]} - {a.dischtime?.split(' ')[0]}</span>
                  <span className="ml-auto text-xs text-slate-500">{a.insurance}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPatient.diagnoses.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-3">Diagnoses ({selectedPatient.diagnoses.length})</h4>
            <div className="flex flex-wrap gap-2">
              {selectedPatient.diagnoses.map((d, i) => (
                <span key={i} className="px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs font-mono text-purple-700">
                  {d.icd_code}
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedPatient.procedures.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-3">Procedures ({selectedPatient.procedures.length})</h4>
            <div className="flex flex-wrap gap-2">
              {selectedPatient.procedures.map((p, i) => (
                <span key={i} className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono text-amber-700">
                  {p.icd_code}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {patientLoading && <LoadingState message="Loading patient details..." />}

      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <DataTable
          columns={columnMap[activeTab]}
          data={data?.items ?? []}
          page={page}
          totalPages={data?.pages ?? 1}
          total={data?.total ?? 0}
          onPageChange={setPage}
          onRowClick={activeTab === 'patients' ? handlePatientClick : activeTab === 'training' ? handleTrainingRecordClick : undefined}
          loading={loading}
        />
      )}
    </div>
  )
}
