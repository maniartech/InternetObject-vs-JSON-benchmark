// Real-world datasets from the Hugging Face Hub. Each source names the dataset,
// and a projection that keeps a clean, uniform subset of columns (renaming keys
// that are awkward as schema names). Rows with a null in a kept column are
// dropped, so every record has the same shape.
//
// Rows are fetched with `npm run fetch-data` and cached under data/hf-cache/
// (git-ignored: licences differ, and one is non-commercial).

export const MAX_ROWS = 1000;

const pick = (row, keys) => Object.fromEntries(keys.map((k) => [k, row[k]]));

export const SOURCES = [
  {
    id: 'adult',
    label: 'Adult census (flat, mixed)',
    hf: { dataset: 'scikit-learn/adult-census-income', config: 'default', split: 'train' },
    project: (r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k.replaceAll('.', '_').replaceAll('-', '_'), v])),
  },
  {
    id: 'spotify',
    label: 'Spotify tracks (flat, numeric)',
    hf: { dataset: 'maharshipandya/spotify-tracks-dataset', config: 'default', split: 'train' },
    project: (r) => {
      const { 'Unnamed: 0': _index, ...rest } = r;
      return rest;
    },
  },
  {
    id: 'squad',
    label: 'SQuAD questions (long text, nested answers)',
    hf: { dataset: 'rajpurkar/squad', config: 'plain_text', split: 'train' },
    project: (r) => pick(r, ['id', 'title', 'context', 'question', 'answers']),
  },
  {
    id: 'hub-models',
    label: 'Hub model metadata (tag arrays)',
    hf: { dataset: 'cfahlgren1/hub-stats', config: 'models', split: 'train' },
    project: (r) => pick(r, ['id', 'author', 'downloads', 'likes', 'pipeline_tag', 'library_name', 'tags', 'createdAt', 'lastModified']),
    note: 'live snapshot, ordered by trending score; changes daily',
  },
  {
    id: 'no-robots',
    label: 'No Robots chats (array of messages)',
    hf: { dataset: 'HuggingFaceH4/no_robots', config: 'default', split: 'train' },
    project: (r) => pick(r, ['prompt_id', 'category', 'messages']),
  },
];
