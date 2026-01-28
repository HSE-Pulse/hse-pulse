"""
PulseNotes - Clinical NLP Service
Bio_ClinicalBERT + FAISS RAG for clinical note analysis
Supports patient lookup and segment extraction from MIMIC-IV notes
"""

import os
import re
import logging
import time
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

try:
    import torch
    from transformers import AutoTokenizer, AutoModel
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])
MODEL_INFERENCE_TIME = Histogram('model_inference_duration_seconds', 'Model inference latency')
MODEL_LOADED = Gauge('model_loaded', 'Whether the model is loaded')
QUERIES_TOTAL = Counter('queries_total', 'Total NLP queries processed')

# Clinical note section patterns (MIMIC-IV style)
SECTION_PATTERNS = {
    'chief_complaint': [
        r'(?:chief\s+complaint|cc|reason\s+for\s+(?:visit|admission)|presenting\s+complaint)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)',
        r'(?:chief\s+complaint|cc)[:\s]*\n([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)'
    ],
    'history_of_present_illness': [
        r'(?:history\s+of\s+present\s+illness|hpi|present\s+illness)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'past_medical_history': [
        r'(?:past\s+medical\s+history|pmh|medical\s+history)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'medications': [
        r'(?:medications|current\s+medications|home\s+medications|meds)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'allergies': [
        r'(?:allergies|drug\s+allergies|nkda)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'physical_exam': [
        r'(?:physical\s+exam(?:ination)?|pe|exam)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'assessment': [
        r'(?:assessment|impression|diagnosis|diagnoses)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'plan': [
        r'(?:plan|treatment\s+plan|recommendations)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'discharge_diagnosis': [
        r'(?:discharge\s+diagnos(?:is|es)|final\s+diagnos(?:is|es))[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'discharge_instructions': [
        r'(?:discharge\s+instructions|instructions)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'vital_signs': [
        r'(?:vital\s+signs|vitals)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ],
    'lab_results': [
        r'(?:lab(?:oratory)?\s+results?|labs)[:\s]*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]+)*)',
    ]
}

# Query intent patterns
QUERY_PATTERNS = {
    'patient_id': [
        r'patient\s+(?:id\s+)?(\d+)',
        r'patient\s*#?\s*(\d+)',
        r'subject[_\s]?id[:\s]*(\d+)',
    ],
    'admission_id': [
        r'admission\s+(?:id\s+)?(\d+)',
        r'hadm[_\s]?id[:\s]*(\d+)',
        r'admission\s*#?\s*(\d+)',
    ],
    'segment': [
        r'(?:what\s+(?:is|was|were)\s+(?:the\s+)?)(chief\s+complaint|hpi|history|medications?|allergies|assessment|plan|diagnosis|diagnoses|vitals?|labs?)',
        r'(?:show|get|find|extract)\s+(?:the\s+)?(chief\s+complaint|hpi|history|medications?|allergies|assessment|plan|diagnosis|diagnoses|vitals?|labs?)',
        r'(chief\s+complaint|hpi|history\s+of\s+present\s+illness|past\s+medical\s+history|medications?|allergies|physical\s+exam|assessment|plan|discharge)',
    ]
}


class NLPModelManager:
    """Manages Clinical BERT model and FAISS index."""

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.index = None
        self.documents = []
        self.doc_id_map = {}  # Maps FAISS index to document metadata
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu') if TRANSFORMERS_AVAILABLE else None
        self.demo_mode = False

    def load_model(self, model_path: str):
        """Load Bio_ClinicalBERT model."""
        try:
            if TRANSFORMERS_AVAILABLE:
                model_name = "emilyalsentzer/Bio_ClinicalBERT"
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModel.from_pretrained(model_name).to(self.device)
                self.model.eval()
                logger.info(f"Loaded {model_name}")
                MODEL_LOADED.set(1)
            else:
                self._create_demo_mode()
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self._create_demo_mode()

    def _create_demo_mode(self):
        """Create demo mode without real model."""
        self.demo_mode = True
        MODEL_LOADED.set(0.5)
        logger.info("Running in demo mode")

    def load_index(self, index_path: str, documents_path: str):
        """Load FAISS index and documents."""
        try:
            if FAISS_AVAILABLE and os.path.exists(index_path):
                self.index = faiss.read_index(index_path)
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
            else:
                self._create_demo_index()
        except Exception as e:
            logger.warning(f"Error loading index: {e}")
            self._create_demo_index()

    def _create_demo_index(self):
        """Create demo index with sample MIMIC-style documents."""
        self.documents = [
            {
                "id": 1,
                "subject_id": 10188106,
                "hadm_id": 20001234,
                "text": """Chief Complaint: Chest pain and shortness of breath

History of Present Illness: 65 year old male presenting with 3 days of worsening chest pain, radiating to left arm. Associated with diaphoresis and nausea.

Past Medical History: Hypertension, Type 2 Diabetes Mellitus, Hyperlipidemia

Medications: Metformin 1000mg BID, Lisinopril 20mg daily, Atorvastatin 40mg daily

Allergies: NKDA

Physical Exam: BP 158/92, HR 98, RR 20, SpO2 94% on RA. Cardiac exam reveals S1S2 with no murmurs.

Assessment: Acute coronary syndrome, rule out STEMI

Plan: Serial troponins, ECG monitoring, Cardiology consult, Consider cardiac catheterization""",
                "category": "Cardiology",
                "note_type": "Admission Note"
            },
            {
                "id": 2,
                "subject_id": 10245789,
                "hadm_id": 20005678,
                "text": """Chief Complaint: Fever and productive cough for 5 days

History of Present Illness: 72 year old female with COPD presenting with worsening productive cough with yellow-green sputum, fever up to 38.9C, and increasing dyspnea.

Past Medical History: COPD, CHF (EF 35%), Atrial fibrillation

Medications: Albuterol inhaler PRN, Tiotropium, Metoprolol 50mg BID, Warfarin 5mg daily

Allergies: Penicillin - rash

Physical Exam: BP 132/78, HR 88 irregular, RR 24, SpO2 88% on RA. Lungs with bilateral rhonchi and wheezes.

Assessment: COPD exacerbation with suspected pneumonia

Plan: Supplemental O2, Nebulized bronchodilators, IV steroids, Azithromycin, Chest X-ray""",
                "category": "Pulmonology",
                "note_type": "Admission Note"
            },
            {
                "id": 3,
                "subject_id": 10312456,
                "hadm_id": 20009012,
                "text": """Chief Complaint: Abdominal pain and vomiting

History of Present Illness: 45 year old male presenting with acute onset RLQ abdominal pain for 12 hours, associated with nausea and vomiting. Pain started periumbilical and migrated to RLQ.

Past Medical History: Appendectomy age 12 (incomplete), Obesity

Medications: None

Allergies: Sulfa drugs

Physical Exam: BP 128/82, HR 102, Temp 38.2C. Abdomen with RLQ tenderness, positive McBurney's point, guarding present.

Assessment: Acute appendicitis

Plan: NPO, IV fluids, Surgical consult for appendectomy, CT abdomen to confirm""",
                "category": "Surgery",
                "note_type": "ED Note"
            },
            {
                "id": 4,
                "subject_id": 10188106,
                "hadm_id": 20001234,
                "text": """Discharge Summary for patient 10188106

Discharge Diagnosis: Non-ST elevation myocardial infarction (NSTEMI), Hypertension, Type 2 Diabetes

Hospital Course: Patient admitted with chest pain, troponins elevated. Underwent cardiac catheterization showing 80% LAD stenosis. Successfully stented with drug-eluting stent.

Discharge Medications: Aspirin 81mg daily, Clopidogrel 75mg daily, Metoprolol 50mg BID, Atorvastatin 80mg daily, Lisinopril 20mg daily, Metformin 1000mg BID

Discharge Instructions: Follow up with Cardiology in 1 week. Continue dual antiplatelet therapy. Cardiac rehab referral placed. Call if chest pain recurs.""",
                "category": "Cardiology",
                "note_type": "Discharge Summary"
            },
            {
                "id": 5,
                "subject_id": 10456123,
                "hadm_id": 20003456,
                "text": """Chief Complaint: Confusion and lethargy

History of Present Illness: 78 year old female brought in by family for 2 days of increasing confusion, decreased oral intake, and urinary incontinence.

Past Medical History: Dementia (baseline MMSE 22), UTI x3 in past year, Hypothyroidism

Medications: Donepezil 10mg daily, Levothyroxine 50mcg daily

Allergies: NKDA

Physical Exam: BP 100/60, HR 92, Temp 38.5C. Alert but disoriented to time and place. Suprapubic tenderness.

Assessment: Altered mental status secondary to urinary tract infection (UTI)

Plan: Urinalysis, Urine culture, IV fluids, Empiric antibiotics (Ciprofloxacin)""",
                "category": "Geriatrics",
                "note_type": "Admission Note"
            }
        ]

        # Build document ID map
        for i, doc in enumerate(self.documents):
            self.doc_id_map[i] = {
                'subject_id': doc.get('subject_id'),
                'hadm_id': doc.get('hadm_id'),
                'doc_id': doc.get('id')
            }

        if FAISS_AVAILABLE:
            dim = 768
            self.index = faiss.IndexFlatL2(dim)
            # In production, these would be actual embeddings
            vectors = np.random.randn(len(self.documents), dim).astype('float32')
            self.index.add(vectors)
        logger.info(f"Created demo index with {len(self.documents)} documents")

    def build_index_from_db(self, notes_collection):
        """Build FAISS index from MongoDB notes collection."""
        try:
            notes = list(notes_collection.find({}).limit(1000))
            if not notes:
                logger.warning("No notes found in database")
                return

            self.documents = []
            vectors = []

            for i, note in enumerate(notes):
                doc = {
                    'id': i,
                    'subject_id': note.get('subject_id'),
                    'hadm_id': note.get('hadm_id'),
                    'text': note.get('text', ''),
                    'category': note.get('category', 'General'),
                    'note_type': note.get('note_type', 'Clinical Note')
                }
                self.documents.append(doc)
                self.doc_id_map[i] = {
                    'subject_id': doc['subject_id'],
                    'hadm_id': doc['hadm_id'],
                    'doc_id': doc['id']
                }

                # Generate embedding
                embedding = self.encode_text(doc['text'][:512])  # Truncate for efficiency
                vectors.append(embedding)

            if FAISS_AVAILABLE and vectors:
                dim = 768
                self.index = faiss.IndexFlatL2(dim)
                vectors_np = np.array(vectors).astype('float32')
                self.index.add(vectors_np)
                logger.info(f"Built FAISS index with {len(self.documents)} documents from database")

        except Exception as e:
            logger.error(f"Error building index from database: {e}")

    def encode_text(self, text: str) -> np.ndarray:
        """Encode text using ClinicalBERT."""
        if self.demo_mode or self.model is None:
            return np.random.randn(768).astype('float32')

        with torch.no_grad():
            inputs = self.tokenizer(text, return_tensors='pt', truncation=True, max_length=512, padding=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state.mean(dim=1).cpu().numpy()
        return embeddings[0].astype('float32')

    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar clinical notes using FAISS."""
        with MODEL_INFERENCE_TIME.time():
            query_vector = self.encode_text(query).reshape(1, -1)

            if self.index is not None and FAISS_AVAILABLE:
                distances, indices = self.index.search(query_vector, k)
                results = []
                for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
                    if idx < len(self.documents):
                        doc = self.documents[idx].copy()
                        doc['score'] = float(1 / (1 + dist))
                        doc['rank'] = i + 1
                        results.append(doc)
                return results
            else:
                return [
                    {**doc, 'score': 0.8 - i * 0.1, 'rank': i + 1}
                    for i, doc in enumerate(self.documents[:k])
                ]

    def find_patient_notes(self, subject_id: int = None, hadm_id: int = None) -> List[Dict[str, Any]]:
        """Find all notes for a specific patient or admission."""
        results = []
        for doc in self.documents:
            if subject_id and doc.get('subject_id') == subject_id:
                results.append(doc)
            elif hadm_id and doc.get('hadm_id') == hadm_id:
                results.append(doc)
        return results

    def extract_section(self, text: str, section: str) -> Optional[str]:
        """Extract a specific section from clinical note text."""
        section_key = section.lower().replace(' ', '_')

        # Map common aliases
        section_aliases = {
            'cc': 'chief_complaint',
            'hpi': 'history_of_present_illness',
            'pmh': 'past_medical_history',
            'meds': 'medications',
            'medication': 'medications',
            'allergy': 'allergies',
            'pe': 'physical_exam',
            'exam': 'physical_exam',
            'diagnosis': 'assessment',
            'diagnoses': 'assessment',
            'vitals': 'vital_signs',
            'labs': 'lab_results',
            'history': 'history_of_present_illness',
            'discharge': 'discharge_diagnosis',
        }

        section_key = section_aliases.get(section_key, section_key)

        if section_key in SECTION_PATTERNS:
            for pattern in SECTION_PATTERNS[section_key]:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    return match.group(1).strip()

        return None

    def extract_entities(self, text: str) -> List[Dict[str, str]]:
        """Extract medical entities from text."""
        entities = []
        keywords = {
            "CONDITION": ["pain", "fever", "infection", "hypertension", "diabetes", "distress", "cough", "dyspnea", "confusion", "nausea"],
            "MEDICATION": ["metformin", "lisinopril", "atorvastatin", "aspirin", "clopidogrel", "metoprolol", "albuterol", "warfarin", "ciprofloxacin"],
            "PROCEDURE": ["appendectomy", "intubated", "ECG", "ventilation", "catheterization", "stent", "x-ray"],
            "ANATOMY": ["chest", "respiratory", "urinary", "abdominal", "cardiac", "pulmonary"]
        }

        text_lower = text.lower()
        for entity_type, words in keywords.items():
            for word in words:
                if word in text_lower:
                    entities.append({"text": word, "type": entity_type})

        QUERIES_TOTAL.inc()
        return entities

    def parse_query(self, query: str) -> Dict[str, Any]:
        """Parse a natural language query to extract intent and parameters."""
        result = {
            'subject_id': None,
            'hadm_id': None,
            'segment': None,
            'query_type': 'search'  # 'search', 'patient_lookup', 'segment_extraction'
        }

        # Extract patient ID
        for pattern in QUERY_PATTERNS['patient_id']:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                result['subject_id'] = int(match.group(1))
                result['query_type'] = 'patient_lookup'
                break

        # Extract admission ID
        for pattern in QUERY_PATTERNS['admission_id']:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                result['hadm_id'] = int(match.group(1))
                result['query_type'] = 'patient_lookup'
                break

        # Extract segment request
        for pattern in QUERY_PATTERNS['segment']:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                result['segment'] = match.group(1).lower().strip()
                if result['subject_id'] or result['hadm_id']:
                    result['query_type'] = 'segment_extraction'
                break

        return result


# Global instance
nlp_manager = NLPModelManager()
mongo_client: Optional[MongoClient] = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global mongo_client, db

    logger.info("Starting PulseNotes service...")

    model_path = os.getenv("MODEL_PATH", "/app/models/clinicalbert")
    nlp_manager.load_model(model_path)
    nlp_manager.load_index(
        os.getenv("INDEX_PATH", "/app/models/faiss.index"),
        os.getenv("DOCS_PATH", "/app/models/documents.json")
    )

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    try:
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command('ping')
        db = mongo_client[os.getenv("MONGO_DB", "mimic")]
        logger.info("Connected to MongoDB")

        # Try to build index from database if notes collection exists
        if 'notes' in db.list_collection_names():
            nlp_manager.build_index_from_db(db['clinical_notes'])

    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}")
        db = None

    yield

    if mongo_client:
        mongo_client.close()
    logger.info("PulseNotes service stopped")


app = FastAPI(
    title="PulseNotes",
    description="Clinical NLP service with Bio_ClinicalBERT and FAISS RAG for patient note search and segment extraction",
    version="1.0.0",
    lifespan=lifespan,
    root_path=os.getenv("ROOT_PATH", "")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query", example="patient with chest pain")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results")


class SearchResult(BaseModel):
    id: int
    subject_id: Optional[int] = None
    hadm_id: Optional[int] = None
    text: str
    category: str
    note_type: Optional[str] = None
    score: float
    rank: int


class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    inference_time_ms: float


class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query", example="what was the chief complaint of patient 10188106")


class RAGQueryResponse(BaseModel):
    query: str
    query_type: str
    subject_id: Optional[int] = None
    hadm_id: Optional[int] = None
    segment_requested: Optional[str] = None
    answer: Optional[str] = None
    source_notes: List[Dict[str, Any]] = []
    inference_time_ms: float


class EntityExtractionRequest(BaseModel):
    text: str = Field(..., description="Clinical note text")


class Entity(BaseModel):
    text: str
    type: str


class EntityExtractionResponse(BaseModel):
    entities: List[Entity]
    inference_time_ms: float


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    index_loaded: bool
    index_size: int
    database_connected: bool
    demo_mode: bool
    timestamp: str


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        model_loaded=nlp_manager.model is not None or nlp_manager.demo_mode,
        index_loaded=nlp_manager.index is not None or len(nlp_manager.documents) > 0,
        index_size=len(nlp_manager.documents),
        database_connected=db is not None,
        demo_mode=nlp_manager.demo_mode,
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/search", response_model=SearchResponse)
async def search_notes(request: SearchRequest):
    """Search clinical notes using semantic similarity."""
    start_time = time.time()

    try:
        results = nlp_manager.search(request.query, request.top_k)
        inference_time = (time.time() - start_time) * 1000

        return SearchResponse(
            results=[SearchResult(**r) for r in results],
            query=request.query,
            inference_time_ms=round(inference_time, 2)
        )
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def rag_query(request: RAGQueryRequest):
    """
    RAG-based query endpoint for natural language questions about patients.

    Examples:
    - "what was the chief complaint of patient 10188106"
    - "show medications for admission 20001234"
    - "find history of present illness for patient 10245789"
    """
    start_time = time.time()

    try:
        # Parse the query to understand intent
        parsed = nlp_manager.parse_query(request.query)

        result = {
            "query": request.query,
            "query_type": parsed['query_type'],
            "subject_id": parsed['subject_id'],
            "hadm_id": parsed['hadm_id'],
            "segment_requested": parsed['segment'],
            "answer": None,
            "source_notes": [],
            "inference_time_ms": 0
        }

        if parsed['query_type'] == 'patient_lookup' or parsed['query_type'] == 'segment_extraction':
            # Find patient notes
            notes = nlp_manager.find_patient_notes(
                subject_id=parsed['subject_id'],
                hadm_id=parsed['hadm_id']
            )

            # Also search MongoDB if available
            if db is not None and not notes:
                try:
                    query_filter = {}
                    if parsed['subject_id']:
                        query_filter['subject_id'] = parsed['subject_id']
                    if parsed['hadm_id']:
                        query_filter['hadm_id'] = parsed['hadm_id']

                    if query_filter:
                        db_notes = list(db['clinical_notes'].find(query_filter))
                        for note in db_notes:
                            notes.append({
                                'id': str(note.get('_id')),
                                'subject_id': note.get('subject_id'),
                                'hadm_id': note.get('hadm_id'),
                                'text': note.get('text', ''),
                                'category': note.get('category', 'General'),
                                'note_type': note.get('note_type', 'Clinical Note')
                            })
                except Exception as e:
                    logger.warning(f"Database query failed: {e}")

            if notes:
                result["source_notes"] = [
                    {
                        'id': n.get('id'),
                        'subject_id': n.get('subject_id'),
                        'hadm_id': n.get('hadm_id'),
                        'note_type': n.get('note_type'),
                        'category': n.get('category')
                    }
                    for n in notes
                ]

                # Extract requested segment if specified
                if parsed['segment']:
                    for note in notes:
                        extracted = nlp_manager.extract_section(note.get('text', ''), parsed['segment'])
                        if extracted:
                            result["answer"] = extracted
                            break

                    if not result["answer"]:
                        result["answer"] = f"Could not find '{parsed['segment']}' section in the patient's notes."
                else:
                    # Return summary of available notes
                    result["answer"] = f"Found {len(notes)} note(s) for patient. Note types: {', '.join(set(n.get('note_type', 'Unknown') for n in notes))}"

            else:
                result["answer"] = f"No notes found for {'patient ' + str(parsed['subject_id']) if parsed['subject_id'] else 'admission ' + str(parsed['hadm_id'])}"

        else:
            # Regular semantic search
            search_results = nlp_manager.search(request.query, 3)
            if search_results:
                result["source_notes"] = [
                    {
                        'id': r.get('id'),
                        'subject_id': r.get('subject_id'),
                        'hadm_id': r.get('hadm_id'),
                        'note_type': r.get('note_type'),
                        'category': r.get('category'),
                        'score': r.get('score')
                    }
                    for r in search_results
                ]
                # Return most relevant note excerpt
                result["answer"] = search_results[0].get('text', '')[:500] + "..."

        result["inference_time_ms"] = round((time.time() - start_time) * 1000, 2)
        QUERIES_TOTAL.inc()
        return result

    except Exception as e:
        logger.error(f"RAG query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-entities", response_model=EntityExtractionResponse)
async def extract_entities(request: EntityExtractionRequest):
    """Extract medical entities from clinical text."""
    start_time = time.time()

    try:
        entities = nlp_manager.extract_entities(request.text)
        inference_time = (time.time() - start_time) * 1000

        return EntityExtractionResponse(
            entities=[Entity(**e) for e in entities],
            inference_time_ms=round(inference_time, 2)
        )
    except Exception as e:
        logger.error(f"Entity extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patients/{subject_id}/notes")
async def get_patient_notes(subject_id: int):
    """Get all notes for a specific patient."""
    start_time = time.time()

    try:
        notes = nlp_manager.find_patient_notes(subject_id=subject_id)

        # Also check MongoDB
        if db is not None:
            try:
                db_notes = list(db['clinical_notes'].find({'subject_id': subject_id}))
                for note in db_notes:
                    # Avoid duplicates
                    if not any(n.get('subject_id') == subject_id and n.get('text') == note.get('text') for n in notes):
                        notes.append({
                            'id': str(note.get('_id')),
                            'subject_id': note.get('subject_id'),
                            'hadm_id': note.get('hadm_id'),
                            'text': note.get('text', ''),
                            'category': note.get('category', 'General'),
                            'note_type': note.get('note_type', 'Clinical Note')
                        })
            except Exception as e:
                logger.warning(f"Database query failed: {e}")

        inference_time = (time.time() - start_time) * 1000

        return {
            'subject_id': subject_id,
            'notes_count': len(notes),
            'notes': notes,
            'inference_time_ms': round(inference_time, 2)
        }

    except Exception as e:
        logger.error(f"Patient notes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sample-scenarios")
async def get_sample_scenarios():
    """Get sample scenarios for demo."""
    return {
        "scenarios": [
            {
                "name": "Patient Lookup",
                "description": "Find chief complaint for a specific patient",
                "query": "what was the chief complaint of patient 10188106",
                "expected": "Chief complaint extraction"
            },
            {
                "name": "Medication Query",
                "description": "Get medications for a patient",
                "query": "show medications for patient 10245789",
                "expected": "Medication list"
            },
            {
                "name": "Semantic Search",
                "description": "Search for cardiac-related notes",
                "query": "patient with chest pain and ST elevation",
                "expected": "Relevant cardiology notes"
            },
            {
                "name": "History Query",
                "description": "Get history of present illness",
                "query": "what is the history of present illness for patient 10312456",
                "expected": "HPI section"
            }
        ]
    }


@app.get("/")
async def root():
    return {
        "service": "PulseNotes",
        "description": "Clinical NLP with Bio_ClinicalBERT + FAISS RAG",
        "version": "1.0.0",
        "endpoints": {
            "/query": "Natural language RAG queries (e.g., 'what was the chief complaint of patient 10188106')",
            "/search": "Semantic search across clinical notes",
            "/extract-entities": "Extract medical entities from text",
            "/patients/{id}/notes": "Get all notes for a patient"
        },
        "docs": "/docs",
        "health": "/health"
    }


# Admin API Endpoints
class TrainingConfig(BaseModel):
    """Index building configuration."""
    embedding_model: str = Field(default="emilyalsentzer/Bio_ClinicalBERT")
    chunk_size: int = Field(default=512)
    index_type: str = Field(default="flat")


class ServiceConfig(BaseModel):
    """Service configuration."""
    embedding_model: Optional[str] = None
    index_path: Optional[str] = None
    top_k: Optional[int] = None
    ner_model: Optional[str] = None
    similarity_threshold: Optional[float] = None
    enable_sections: Optional[bool] = None


service_config = {
    "embedding_model": "emilyalsentzer/Bio_ClinicalBERT",
    "index_path": "/app/models/faiss.index",
    "top_k": 5,
    "ner_model": "en_core_sci_lg",
    "similarity_threshold": 0.7,
    "enable_sections": True
}


@app.post("/train")
async def rebuild_index(config: TrainingConfig):
    """Rebuild the FAISS index with new embeddings."""
    logger.info(f"Index rebuild requested with config: {config}")

    # In production, this would rebuild the index
    if db is not None:
        try:
            nlp_manager.build_index_from_db(db['clinical_notes'])
            return {
                "status": "completed",
                "message": "Index rebuilt successfully",
                "config": config.dict()
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    return {
        "status": "completed",
        "message": "Index rebuild simulated (no database)",
        "config": config.dict()
    }


@app.get("/config")
async def get_config():
    """Get current service configuration."""
    return service_config


@app.post("/config")
async def update_config(config: ServiceConfig):
    """Update service configuration."""
    global service_config
    for key, value in config.dict().items():
        if value is not None:
            service_config[key] = value
    logger.info(f"Configuration updated: {service_config}")
    return {"status": "updated", "config": service_config}
