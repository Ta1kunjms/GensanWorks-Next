export interface TFIDFVector {
  terms: Map<string, number>;
  dense: Float32Array;
  nnz: number;
}

export interface VectorizerConfig {
  minDf?: number;
  maxDf?: number;
  sublinearTf?: boolean;
  ngramRange?: [number, number];
  stopWords?: Set<string>;
}

const DEFAULT_STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','can',
  'this','that','these','those','it','its','they','them','their',
  'we','our','you','your','he','his','she','her','i','my','me',
  'not','no','nor','so','yet','both','either','neither','each',
  'more','most','other','some','such','than','then','there','when',
  'where','which','while','who','whom','how','all','any','both',
  'few','most','other','into','through','during','before','after',
  'above','below','between','out','off','over','under','again','further',
  'once','here','own','same','too','very','just','because','as','until',
  'about','against','among','around','without',
  'work','working','works','worked','experience','experienced','skill',
  'skills','knowledge','ability','able','must','required','requirement',
  'preferred','plus','bonus','good','great','excellent','strong',
  'proven','demonstrated','hands','years','year','month',
  'minimum','least','relevant','related','including','include',
  'ng','sa','ang','na','at','ay','mga','para','nang','din','rin','kung',
  'kaya','pero','siya','niya','nila','kami','tayo','kayo','ikaw','ako',
]);

export class TFIDFVectorizer {
  vocabulary: Map<string, number> = new Map();
  terms: string[] = [];
  private df: Map<string, number> = new Map();
  private N = 0;
  private config: Required<VectorizerConfig>;
  private fitted = false;

  constructor(config: VectorizerConfig = {}) {
    this.config = {
      minDf: config.minDf ?? 2,
      maxDf: config.maxDf ?? 0.95,
      sublinearTf: config.sublinearTf ?? true,
      ngramRange: config.ngramRange ?? [1, 2],
      stopWords: config.stopWords ?? DEFAULT_STOP_WORDS,
    };
  }

  private tokenize(text: string): string[] {
    const cleaned = text
      .toLowerCase()
      .replace(/[^a-z0-9\s\-\.#\+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = cleaned
      .split(' ')
      .filter(t => t.length > 1 && !this.config.stopWords.has(t));

    return this.buildNgrams(tokens);
  }

  private buildNgrams(tokens: string[]): string[] {
    const [minN, maxN] = this.config.ngramRange;
    const ngrams: string[] = [];
    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.push(tokens.slice(i, i + n).join(' '));
      }
    }
    return ngrams;
  }

  private termFrequency(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    return tf;
  }

  fit(corpus: string[]): this {
    this.N = corpus.length;
    this.vocabulary.clear();
    this.df.clear();
    this.terms = [];

    for (const doc of corpus) {
      const tokens = new Set(this.tokenize(doc));
      for (const token of tokens) {
        this.df.set(token, (this.df.get(token) ?? 0) + 1);
      }
    }

    const maxDfAbs = this.config.maxDf <= 1
      ? Math.floor(this.config.maxDf * this.N)
      : this.config.maxDf;

    let idx = 0;
    for (const [term, freq] of this.df.entries()) {
      if (freq >= this.config.minDf && freq <= maxDfAbs) {
        this.vocabulary.set(term, idx++);
        this.terms.push(term);
      }
    }

    this.fitted = true;
    return this;
  }

  transform(doc: string): TFIDFVector {
    if (!this.fitted) throw new Error('TFIDFVectorizer: call fit() before transform()');

    const tokens = this.tokenize(doc);
    const tf = this.termFrequency(tokens);
    const dense = new Float32Array(this.vocabulary.size);
    const sparse = new Map<string, number>();

    for (const [term, count] of tf.entries()) {
      const col = this.vocabulary.get(term);
      if (col === undefined) continue;

      const tfVal = this.config.sublinearTf
        ? 1 + Math.log(count)
        : count;

      const df = this.df.get(term) ?? 1;
      const idf = Math.log((1 + this.N) / (1 + df)) + 1;

      const weight = tfVal * idf;
      dense[col] = weight;
      sparse.set(term, weight);
    }

    const magnitude = Math.sqrt(dense.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dense.length; i++) { const v = dense[i]; if (v !== undefined) dense[i] = v / magnitude; }
      for (const [t, v] of sparse.entries()) sparse.set(t, v / magnitude);
    }

    return {
      terms: sparse,
      dense,
      nnz: sparse.size,
    };
  }

  fitTransform(corpus: string[]): TFIDFVector[] {
    this.fit(corpus);
    return corpus.map(doc => this.transform(doc));
  }

  static cosineSimilarity(vecA: TFIDFVector, vecB: TFIDFVector): number {
    if (vecA.nnz === 0 || vecB.nnz === 0) return 0;

    let dot = 0;
    const [small, large] = vecA.nnz <= vecB.nnz
      ? [vecA.terms, vecB.terms]
      : [vecB.terms, vecA.terms];

    for (const [term, weightA] of small.entries()) {
      const weightB = large.get(term);
      if (weightB !== undefined) dot += weightA * weightB;
    }

    return Math.min(1, Math.max(0, dot));
  }

  static topTerms(vec: TFIDFVector, n = 10): Array<{ term: string; weight: number }> {
    return Array.from(vec.terms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([term, weight]) => ({ term, weight }));
  }

  serialize(): string {
    return JSON.stringify({
      vocabulary: Array.from(this.vocabulary.entries()),
      terms: this.terms,
      df: Array.from(this.df.entries()),
      N: this.N,
      config: {
        ...this.config,
        stopWords: Array.from(this.config.stopWords),
      },
    });
  }

  static deserialize(json: string): TFIDFVectorizer {
    const data = JSON.parse(json);
    const v = new TFIDFVectorizer({
      ...data.config,
      stopWords: new Set(data.config.stopWords),
    });
    v.vocabulary = new Map(data.vocabulary);
    v.terms = data.terms;
    v.df = new Map(data.df);
    v.N = data.N;
    v.fitted = true;
    return v;
  }

  get vocabularySize(): number {
    return this.vocabulary.size;
  }

  get corpusSize(): number {
    return this.N;
  }
}
