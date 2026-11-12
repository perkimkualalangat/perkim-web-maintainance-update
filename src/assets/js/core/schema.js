/* ============================================================
   SCHEMA.JS — Definisi 17 entiti + validasi
   Rujukan: docs/DATA_DICTIONARY.md (Fasa 2)
   ------------------------------------------------------------
   Fungsi utama:
     validate(entityType, data)  -> { valid, errors[] }
     validateUnique(entityType, items)  -> errors[] (ID duplikat)
     checkReferences(entityType, data, pools) -> errors[]
     collectRefIssues(dataset)   -> senarai rujukan rosak (Jurang)
   ------------------------------------------------------------
   TOLERANSI TERHADAP SEED (dokumentasi, bukan medan baharu):
   1. procyclicality turut terima "Ya"/"Tidak" — semua 7 seed
      fallback menggunakannya (§2.10 menyenaraikan Rendah/Sederhana/Tinggi).
   2. cost.timing terima enum ATAU teks masa khusus (kes sejarah:
      "15 Ogos 1971", "Mac 2023").
   3. evidence.date terima YYYY, YYYY-MM, YYYY-MM-DD atau julat
      YYYY–YYYY (seed menggunakan tarikh separa).
   4. case.date ialah label tempoh bebas (contoh "Mac 2023") —
      bukan tarikh ISO penuh.
   5. capture.evidence & reflexivity.evidence: evidence_id ATAU
      teks deskriptif (seed mengandungi teks seperti "Laporan media").
   6. Integriti rujukan silang disemak BERASINGAN daripada
      validate() (lihat checkReferences / collectRefIssues):
      import ditolak jika rujukan rosak, tetapi beban seed yang
      sedia rosak dilaporkan sebagai jurang penyelidikan.
   ============================================================ */

/* ---------- Enums standard (DATA_DICTIONARY §2) ---------- */

export const EVIDENCE_STATUS = ['Kuat', 'Lemah', 'Teoritikal', 'Normatif'];
export const CONTROL_LEVELS = ['K1', 'K2', 'K3', 'K4', 'K5'];
export const LAYER_IDS = ['L1', 'L2', 'L3', 'L4', 'L5'];
export const SYSTEM_TYPES = ['Fiat', 'Kripto', 'AI', 'Hibrid'];
export const SYSTEM_SCOPES = ['Global', 'Serantau', 'Nasional', 'Sektor', 'Institusi'];
export const WEAKNESS_TYPES = ['Endogen', 'Eksogen'];
export const WEAKNESS_TIMES = ['Akut', 'Kronik'];
export const WEAKNESS_VISIBILITY = ['Diketahui', 'Separa', 'Tersembunyi'];
export const WEAKNESS_DISTRIBUTION = ['Tertumpu', 'Tersebar'];
export const WEAKNESS_REVERSIBILITY = ['Boleh balik', 'Separa', 'Tidak'];
export const HAZARD_LEVELS = ['Rendah', 'Sederhana', 'Tinggi'];
export const PROCYCLICALITY = ['Rendah', 'Sederhana', 'Tinggi', 'Ya', 'Tidak'];
export const COST_TYPES = ['Fiskal', 'Monetari', 'Modal', 'Masa', 'Privasi', 'Maruah', 'Generasi', 'Ekologi', 'Epistemik'];
export const COST_TIMINGS = ['Sekarang', 'Semasa krisis', 'Masa depan'];
export const COST_VISIBILITY = ['Telus', 'Separa', 'Tersembunyi'];
export const JUSTICE_DIMENSIONS = ['Distributif', 'Prosedural', 'Korektif', 'Antara generasi', 'Epistemik'];
export const ACTOR_TYPES = ['Negara', 'Regulator', 'Bank', 'Platform', 'Individu', 'Komuniti', 'Akademik', 'Media'];
export const EVIDENCE_TYPES = ['Data', 'Kajian', 'Laporan', 'Sejarah', 'Teori', 'Dokumen'];
export const METRIC_STRENGTH = ['Kuat', 'Sederhana', 'Lemah'];
export const RISK_LEVELS = ['Rendah', 'Sederhana', 'Tinggi'];

/* ---------- Utiliti ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOOSE_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const RANGE_DATE = /^\d{4}[–-]\d{4}$/;

/** Tarikh ISO penuh YYYY-MM-DD? */
export function isISODate(value) {
  return typeof value === 'string' && ISO_DATE.test(value);
}

/** Tarikh longgar untuk sumber: YYYY / YYYY-MM / YYYY-MM-DD / julat. */
export function isLooseDate(value) {
  if (typeof value !== 'string') return false;
  return LOOSE_DATE.test(value) || RANGE_DATE.test(value);
}

/** Tarikh hari ini dalam format YYYY-MM-DD. */
export function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ---------- Definisi skema 17 entiti (DATA_DICTIONARY §3) ----------
   Spesifikasi medan:
     id        : medan ID unik (padan idPattern)
     string    : teks; required + allowEmpty mengawal kekosongan
     enum      : nilai dalam senarai values
     int       : integer; min/max pilihan
     date      : tarikh ISO penuh YYYY-MM-DD
     looseDate : tarikh longgar (rujukan sumber sahaja)
     refs      : senarai rujukan ID; ref = entiti sasaran
     ref       : satu rujukan ID; ref = entiti sasaran
     refOrText : rujukan ID ATAU teks deskriptif (soft reference)
------------------------------------------------------------------*/

export const SCHEMAS = {
  layers: {
    type: 'layers',
    label: 'Layer',
    idField: 'layer_id',
    idPattern: /^L[1-5]$/,
    fields: {
      layer_id: { type: 'id' },
      name: { type: 'string', required: true },
      description: { type: 'string', required: true, allowEmpty: true },
      components: { type: 'refs', ref: 'components', required: true, allowEmpty: true },
      power_forms: { type: 'string', required: true },
      gaps: { type: 'stringList', required: true, allowEmpty: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  systems: {
    type: 'systems',
    label: 'System',
    idField: 'system_id',
    idPattern: /^SYS-[A-Z0-9-]+$/,
    fields: {
      system_id: { type: 'id' },
      name: { type: 'string', required: true },
      type: { type: 'enum', values: SYSTEM_TYPES, required: true },
      scope: { type: 'enum', values: SYSTEM_SCOPES, required: true },
      timeframe: { type: 'string', required: true },
      description: { type: 'string', required: true, allowEmpty: true },
      key_actors: { type: 'refs', ref: 'actors', required: true, allowEmpty: true },
      key_components: { type: 'refs', ref: 'components', required: true, allowEmpty: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  components: {
    type: 'components',
    label: 'Component',
    idField: 'component_id',
    idPattern: /^C\d{2}-[A-Z0-9-]+$/,
    fields: {
      component_id: { type: 'id' },
      name: { type: 'string', required: true },
      definition: { type: 'string', required: true },
      layer_primary: { type: 'enum', values: LAYER_IDS, required: true },
      control_level: { type: 'enum', values: CONTROL_LEVELS, required: true },
      actors: { type: 'refs', ref: 'actors', required: true, allowEmpty: true },
      mechanisms: { type: 'string', required: true },
      weaknesses: { type: 'refs', ref: 'weaknesses', required: true, allowEmpty: true },
      fallbacks: { type: 'refs', ref: 'fallbacks', required: true, allowEmpty: true },
      costs: { type: 'refs', ref: 'costs', required: true, allowEmpty: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  weaknesses: {
    type: 'weaknesses',
    label: 'Weakness',
    idField: 'weakness_id',
    idPattern: /^W-[A-Z0-9-]+$/,
    fields: {
      weakness_id: { type: 'id' },
      name: { type: 'string', required: true },
      type: { type: 'enum', values: WEAKNESS_TYPES, required: true },
      time: { type: 'enum', values: WEAKNESS_TIMES, required: true },
      visibility: { type: 'enum', values: WEAKNESS_VISIBILITY, required: true },
      distribution: { type: 'enum', values: WEAKNESS_DISTRIBUTION, required: true },
      reversibility: { type: 'enum', values: WEAKNESS_REVERSIBILITY, required: true },
      control_level: { type: 'enum', values: CONTROL_LEVELS, required: true },
      affected_components: { type: 'refs', ref: 'components', required: true, allowEmpty: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  fallbacks: {
    type: 'fallbacks',
    label: 'Fallback',
    idField: 'fallback_id',
    idPattern: /^F-[A-Z0-9-]+$/,
    fields: {
      fallback_id: { type: 'id' },
      name: { type: 'string', required: true },
      trigger: { type: 'string', required: true },
      authority: { type: 'ref', ref: 'actors', required: true },
      cost_bearer: { type: 'ref', ref: 'actors', required: true },
      coverage: { type: 'string', required: true },
      time: { type: 'string', required: true },
      moral_hazard: { type: 'enum', values: HAZARD_LEVELS, required: true },
      procyclicality: { type: 'enum', values: PROCYCLICALITY, required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  costs: {
    type: 'costs',
    label: 'Cost',
    idField: 'cost_id',
    idPattern: /^COST-[A-Z0-9$-]+$/,
    fields: {
      cost_id: { type: 'id' },
      name: { type: 'string', required: true },
      type: { type: 'enum', values: COST_TYPES, required: true },
      amount: { type: 'string', required: true },
      bearer: { type: 'ref', ref: 'actors', required: true },
      timing: { type: 'enum', values: COST_TIMINGS, required: true, allowText: true },
      visibility: { type: 'enum', values: COST_VISIBILITY, required: true },
      justice_dimension: { type: 'enum', values: JUSTICE_DIMENSIONS, required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  actors: {
    type: 'actors',
    label: 'Actor',
    idField: 'actor_id',
    idPattern: /^ACT-[A-Z0-9-]+$/,
    fields: {
      actor_id: { type: 'id' },
      name: { type: 'string', required: true },
      type: { type: 'enum', values: ACTOR_TYPES, required: true },
      power_forms: { type: 'string', required: true },
      interests: { type: 'string', required: true },
      accountability: { type: 'string', required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  evidence: {
    type: 'evidence',
    label: 'Evidence',
    idField: 'evidence_id',
    idPattern: /^EV-[A-Z0-9-]+$/,
    fields: {
      evidence_id: { type: 'id' },
      source: { type: 'string', required: true },
      type: { type: 'enum', values: EVIDENCE_TYPES, required: true },
      claim: { type: 'string', required: true },
      strength: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      date: { type: 'looseDate', required: true },
      link: { type: 'string', required: false, allowEmpty: true },
      limitations: { type: 'string', required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  principles: {
    type: 'principles',
    label: 'Principle',
    idField: 'principle_id',
    idPattern: /^P\d+-[A-Z0-9-]+$/,
    fields: {
      principle_id: { type: 'id' },
      name: { type: 'string', required: true },
      definition: { type: 'string', required: true },
      metrics: { type: 'refs', ref: 'metrics', required: true, allowEmpty: true },
      failed_in_cases: { type: 'refs', ref: 'cases', required: true, allowEmpty: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  metrics: {
    type: 'metrics',
    label: 'Metric',
    idField: 'metric_id',
    idPattern: /^M-[A-Z0-9-]+$/,
    fields: {
      metric_id: { type: 'id' },
      name: { type: 'string', required: true },
      definition: { type: 'string', required: true },
      unit: { type: 'string', required: true },
      source: { type: 'string', required: true },
      strength: { type: 'enum', values: METRIC_STRENGTH, required: true },
      limitations: { type: 'string', required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  cases: {
    type: 'cases',
    label: 'Case',
    idField: 'case_id',
    idPattern: /^CASE-[A-Z0-9-]+$/,
    fields: {
      case_id: { type: 'id' },
      name: { type: 'string', required: true },
      date: { type: 'string', required: true },
      system: { type: 'ref', ref: 'systems', required: true },
      principles_failed: { type: 'refs', ref: 'principles', required: true, allowEmpty: true },
      components_affected: { type: 'refs', ref: 'components', required: true, allowEmpty: true },
      costs: { type: 'refs', ref: 'costs', required: true, allowEmpty: true },
      lessons: { type: 'string', required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  topics: {
    type: 'topics',
    label: 'Topic',
    idField: 'topic_id',
    idPattern: /^TOPIC-[A-Z0-9-]+$/,
    fields: {
      topic_id: { type: 'id' },
      name: { type: 'string', required: true },
      description: { type: 'string', required: true },
      components: { type: 'refs', ref: 'components', required: true, allowEmpty: true },
      actors: { type: 'refs', ref: 'actors', required: true, allowEmpty: true },
      costs: { type: 'refs', ref: 'costs', required: true, allowEmpty: true },
      open_questions: { type: 'stringList', required: true, allowEmpty: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  narratives: {
    type: 'narratives',
    label: 'Narrative',
    idField: 'narrative_id',
    idPattern: /^NAR-[A-Z0-9-]+$/,
    fields: {
      narrative_id: { type: 'id' },
      claim: { type: 'string', required: true },
      who_promotes: { type: 'refs', ref: 'actors', required: true, allowEmpty: true },
      evidence_against: { type: 'string', required: true },
      capture_risk: { type: 'enum', values: RISK_LEVELS, required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  captures: {
    type: 'captures',
    label: 'Capture',
    idField: 'capture_id',
    idPattern: /^CAP-[A-Z0-9-]+$/,
    fields: {
      capture_id: { type: 'id' },
      actor: { type: 'ref', ref: 'actors', required: true },
      institution: { type: 'ref', ref: 'actors', required: true },
      mechanism: { type: 'string', required: true },
      evidence: { type: 'refOrText', ref: 'evidence', required: true },
      risk_level: { type: 'enum', values: RISK_LEVELS, required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  reflexivity: {
    type: 'reflexivity',
    label: 'Reflexivity',
    idField: 'reflexivity_id',
    idPattern: /^REF-[A-Z0-9-]+$/,
    fields: {
      reflexivity_id: { type: 'id' },
      model_or_metric: { type: 'string', required: true },
      behavior_change: { type: 'string', required: true },
      feedback_loop: { type: 'string', required: true },
      evidence: { type: 'refOrText', ref: 'evidence', required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  exitvoice: {
    type: 'exitvoice',
    label: 'ExitVoice',
    idField: 'exitvoice_id',
    idPattern: /^EV-[A-Z0-9-]+$/,
    fields: {
      exitvoice_id: { type: 'id' },
      system: { type: 'ref', ref: 'systems', required: true },
      exit_cost: { type: 'string', required: true },
      voice_power: { type: 'string', required: true },
      contestability_score: { type: 'int', required: true, min: 0, max: 100 },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },

  unknownunknowns: {
    type: 'unknownunknowns',
    label: 'UnknownUnknown',
    idField: 'uu_id',
    idPattern: /^UU-[A-Z0-9-]+$/,
    fields: {
      uu_id: { type: 'id' },
      domain: { type: 'string', required: true },
      why_unknown: { type: 'string', required: true },
      buffer: { type: 'string', required: true },
      scenario: { type: 'string', required: true },
      review_date: { type: 'date', required: true },
      evidence_status: { type: 'enum', values: EVIDENCE_STATUS, required: true },
      sources: { type: 'refs', ref: 'evidence', required: true, allowEmpty: true },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
  },
};

/* Urutan piawai 17 entiti (padan senarai /data/*.json) */
export const ENTITY_TYPES = [
  'layers', 'systems', 'components', 'weaknesses', 'fallbacks', 'costs',
  'actors', 'evidence', 'principles', 'metrics', 'cases', 'topics',
  'narratives', 'captures', 'reflexivity', 'exitvoice', 'unknownunknowns',
];

/** Dapatkan definisi skema untuk satu jenis entiti. */
export function schemaFor(entityType) {
  const schema = SCHEMAS[entityType];
  if (!schema) throw new Error(`Jenis entiti tidak dikenali: ${entityType}`);
  return schema;
}

/* ---------- Validasi entiti tunggal ---------- */

const REF_ID = /^[A-Z][A-Z0-9$-]*$/;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateField(schema, field, spec, data, errors) {
  const value = data[field];
  const present = Object.prototype.hasOwnProperty.call(data, field);
  const err = (message) => errors.push({ field, message });

  if (!present || value === '' || value === null || value === undefined) {
    if (spec.required && !spec.allowEmpty) err(`Medan "${field}" diperlukan.`);
    return;
  }

  switch (spec.type) {
    case 'id': {
      if (typeof value !== 'string' || !schema.idPattern.test(value)) {
        err(`ID "${value}" tidak mematuhi format ${schema.idField} (contoh prefix tidak sah).`);
      }
      break;
    }
    case 'string': {
      if (typeof value !== 'string') err(`Medan "${field}" mesti teks.`);
      break;
    }
    case 'stringList': {
      if (!Array.isArray(value)) err(`Medan "${field}" mesti senarai teks.`);
      else if (value.some((v) => typeof v !== 'string')) err(`Semua item "${field}" mesti teks.`);
      break;
    }
    case 'enum': {
      if (typeof value !== 'string') {
        err(`Medan "${field}" mesti teks enum.`);
      } else if (!spec.values.includes(value)) {
        if (!(spec.allowText && value.trim().length > 0)) {
          err(`Nilai "${value}" tidak sah untuk ${field}. Dibenarkan: ${spec.values.join(', ')}.`);
        }
      }
      break;
    }
    case 'int': {
      if (!Number.isInteger(value)) err(`Medan "${field}" mesti integer.`);
      else if (spec.min !== undefined && value < spec.min) err(`Medan "${field}" mesti ≥ ${spec.min}.`);
      else if (spec.max !== undefined && value > spec.max) err(`Medan "${field}" mesti ≤ ${spec.max}.`);
      break;
    }
    case 'date': {
      if (!isISODate(value)) err(`Medan "${field}" mesti tarikh format YYYY-MM-DD.`);
      break;
    }
    case 'looseDate': {
      if (!isLooseDate(value)) err(`Medan "${field}" mesti tarikh YYYY, YYYY-MM, YYYY-MM-DD atau julat tahun.`);
      break;
    }
    case 'refs': {
      if (!Array.isArray(value)) {
        err(`Medan "${field}" mesti senarai rujukan ID.`);
      } else {
        value.forEach((item) => {
          if (typeof item !== 'string' || !REF_ID.test(item)) {
            err(`Rujukan "${item}" dalam ${field} bukan format ID yang sah.`);
          }
        });
      }
      break;
    }
    case 'ref': {
      if (typeof value !== 'string' || !REF_ID.test(value)) {
        err(`Medan "${field}" mesti rujukan ID yang sah.`);
      }
      break;
    }
    case 'refOrText': {
      if (typeof value !== 'string' || value.trim() === '') {
        err(`Medan "${field}" mesti rujukan ID atau teks.`);
      }
      break;
    }
    default:
      err(`Spesifikasi medan "${field}" tidak dikenali dalam skema.`);
  }
}

/**
 * Validasi satu entiti terhadap skema.
 * @param {string} entityType - salah satu ENTITY_TYPES
 * @param {object} data - rekod entiti
 * @returns {{valid: boolean, errors: Array<{field: string, message: string}>}}
 */
export function validate(entityType, data) {
  const errors = [];
  let schema;
  try {
    schema = schemaFor(entityType);
  } catch (e) {
    return { valid: false, errors: [{ field: null, message: e.message }] };
  }
  if (!isPlainObject(data)) {
    return { valid: false, errors: [{ field: null, message: 'Rekod mesti objek JSON.' }] };
  }

  const { fields } = schema;
  for (const [field, spec] of Object.entries(fields)) {
    validateField(schema, field, spec, data, errors);
  }

  // Medan asing (tidak dikenali) — dikesan untuk kekalkan disiplin skema.
  for (const key of Object.keys(data)) {
    if (!fields[key]) {
      errors.push({ field: key, message: `Medan "${key}" tidak dikenali dalam skema ${entityType}.` });
    }
  }

  // Peraturan §1.2: "Kuat" / "Lemah" memerlukan sekurang-kurangnya 1 sumber.
  if (fields.evidence_status && fields.sources) {
    const status = data.evidence_status;
    const sources = data.sources;
    if ((status === 'Kuat' || status === 'Lemah') && Array.isArray(sources) && sources.length === 0) {
      errors.push({
        field: 'sources',
        message: `evidence_status "${status}" memerlukan sekurang-kurangnya satu sumber.`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Semak ID unik dalam senarai entiti.
 * @returns {Array<{field: string, message: string}>}
 */
export function validateUnique(entityType, items) {
  const schema = schemaFor(entityType);
  const errors = [];
  const seen = new Map();
  items.forEach((item, index) => {
    const id = isPlainObject(item) ? item[schema.idField] : undefined;
    if (id === undefined) return;
    if (seen.has(id)) {
      errors.push({
        field: schema.idField,
        message: `ID duplikat "${id}" pada indeks ${seen.get(id)} dan ${index} dalam ${entityType}.`,
      });
    } else {
      seen.set(id, index);
    }
  });
  return errors;
}

/* ---------- Integriti rujukan silang ---------- */

/**
 * Semak semua rujukan silang satu entiti terhadap kumpulan ID sedia ada.
 * @param {string} entityType
 * @param {object} data
 * @param {Record<string, Set<string>|Array<string>>} pools - ID setiap entiti sasaran
 * @returns {Array<{field: string, message: string}>}
 */
export function checkReferences(entityType, data, pools) {
  const errors = [];
  const schema = schemaFor(entityType);
  const has = (target, id) => {
    const pool = pools[target];
    if (!pool) return true; // tiada maklumat -> jangan tolak (dilaporkan berasingan)
    return pool instanceof Set ? pool.has(id) : pool.includes(id);
  };

  for (const [field, spec] of Object.entries(schema.fields)) {
    const value = data[field];
    if (value === undefined || value === null) continue;

    if (spec.type === 'refs' && Array.isArray(value)) {
      value.forEach((id) => {
        if (typeof id === 'string' && !has(spec.ref, id)) {
          errors.push({ field, message: `Rujukan rosak: ${field} → ${id} tidak wujud dalam ${spec.ref}.` });
        }
      });
    } else if (spec.type === 'ref' && typeof value === 'string') {
      if (!has(spec.ref, value)) {
        errors.push({ field, message: `Rujukan rosak: ${field} → ${value} tidak wujud dalam ${spec.ref}.` });
      }
    } else if (spec.type === 'refOrText' && typeof value === 'string') {
      // Hanya nilai berbentuk ID (contoh EV-...) disemak; teks bebas dibenarkan.
      if (REF_ID.test(value) && value.includes('-')) {
        const looksLikeId = /^(EV|W|F|COST|ACT|C\d{2}|SYS|L\d|P\d|M|CASE|TOPIC|NAR|CAP|REF|UU)-/.test(value);
        if (looksLikeId && !has(spec.ref, value)) {
          errors.push({ field, message: `Rujukan rosak: ${field} → ${value} tidak wujud dalam ${spec.ref}.` });
        }
      }
    }
  }
  return errors;
}

/**
 * Cari semua rujukan rosak merentas satu set data penuh.
 * @param {Record<string, Array<object>>} dataset - { systems: [...], components: [...], ... }
 * @returns {Array<{entity: string, id: string, field: string, target: string, missing: string[]}>}
 */
export function collectRefIssues(dataset) {
  const pools = {};
  for (const type of ENTITY_TYPES) {
    const schema = SCHEMAS[type];
    const items = Array.isArray(dataset[type]) ? dataset[type] : [];
    pools[type] = new Set(items.map((item) => item && item[schema.idField]).filter(Boolean));
  }

  const issues = [];
  for (const type of ENTITY_TYPES) {
    const schema = SCHEMAS[type];
    const items = Array.isArray(dataset[type]) ? dataset[type] : [];
    for (const item of items) {
      if (!isPlainObject(item)) continue;
      const refErrors = checkReferences(type, item, pools);
      for (const err of refErrors) {
        issues.push({
          entity: type,
          id: item[schema.idField] || '(tiada ID)',
          field: err.field,
          target: (schema.fields[err.field] || {}).ref || null,
          missing: extractMissingId(err.message),
        });
      }
    }
  }
  return issues;
}

function extractMissingId(message) {
  const m = message.match(/→\s*(\S+)\s+tidak wujud/);
  return m ? [m[1]] : [];
}

/* ---------- Statistik ringkas untuk UI ---------- */

export function countBy(dataset, type) {
  return Array.isArray(dataset[type]) ? dataset[type].length : 0;
}
