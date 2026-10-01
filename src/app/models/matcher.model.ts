/*
 * Wire types of the THEMIS matcher HTTP API (`themis-matcher serve`), mirrored by hand from backend-core's
 * `libs/shared/src/themis_shared/contracts/{api,retrieval}.py`. Field names stay snake_case so a response
 * can be used as-is; keep this file in step with those Pydantic models.
 */

export type SourceType = 'publication' | 'thesis_posting';

/** Body of both `POST /v1/match` and `POST /v1/recommend`. */
export interface MatchRequest {
  /** Free text, at least one character; the matcher parses it. */
  query: string;
  /** 1..50, the backend defaults to 5. */
  top_k: number;
}

/** One retrieved record a match is based on. Only publications carry a year. */
export interface Evidence {
  source_type: SourceType;
  source_id: string;
  title: string;
  url: string | null;
  year: number | null;
}

export interface SupervisorMatch {
  supervisor: string;
  department: string | null;
  /** Cosine similarity in [-1, 1] — not a probability. Equals the maximum of `source_scores`. */
  score: number;
  source_scores: Partial<Record<SourceType, number>>;
  has_uzh_affiliation: boolean;
  /** Always empty today; the matcher does not fill it yet. */
  matched_topics: string[];
  publication_count: number;
  posting_count: number;
  evidence: Evidence[];
}

/** Already ordered by the backend (UZH-affiliated first), so render in the order received. */
export interface MatchResponse {
  matches: SupervisorMatch[];
}

/** Plain text with newlines: LLM prose, or the template synthesiser's list when no LLM answers. */
export interface RecommendResponse {
  answer: string;
}

export interface IndexStatus {
  embedding_model: string;
  embedding_dim: number;
  document_count: number;
  sources: string | null;
  max_seq_length: number | null;
  truncated_docs: number;
}

export type IndexRunKind = 'publication' | 'thesis_posting' | 'all';
export type IndexRunState = 'running' | 'succeeded' | 'failed';

/** The two trigger endpoints: `POST /v1/index/publications` and `POST /v1/index/postings`. */
export type IndexTrigger = 'publications' | 'postings';

export interface IndexRunAccepted {
  run_id: number;
  kind: IndexRunKind;
}

/**
 * One indexing run. The counters are written only when the run finishes; while it is `running`, only
 * `heartbeat_at` moves (once per embedded chunk).
 */
export interface IndexRun {
  id: number;
  kind: IndexRunKind;
  state: IndexRunState;
  /** `postgres`, or the JSONL directory the run read. */
  source: string;
  embedded: number;
  skipped: number;
  deleted: number;
  truncated: number;
  invalid_lines: number;
  error: string | null;
  started_at: string;
  heartbeat_at: string;
  finished_at: string | null;
}

/** Body of every application error (4xx/5xx other than 422). Flat — there is no `detail` wrapper. */
export interface ApiError {
  code: string;
  message: string;
  /** Set on `index_run_in_progress`: the run holding the slot. */
  run_id: number | null;
}
