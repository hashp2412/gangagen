# Free Alternatives for Sequence Search on 2M Records

## 1. **Add Prefix Columns** (Recommended)
Instead of indexing full sequences, add columns for sequence prefixes:
- `seq_prefix_5` - First 5 characters
- `seq_prefix_10` - First 10 characters  
- `seq_prefix_20` - First 20 characters

Benefits:
- Much smaller indexes (5-20 chars vs full sequences)
- Fast searches without expensive operations
- Works well with Supabase free tier

Implementation: Run `create_sequence_prefix_column.sql`

## 2. **Client-Side Search with Progressive Loading**
```javascript
// Load sequences in chunks and search client-side
async function clientSideSequenceSearch(searchSeq) {
  const results = [];
  let offset = 0;
  const chunkSize = 1000;
  
  while (results.length < 20) { // Get 20 results
    const { data } = await supabase
      .from('proteins')
      .select('*')
      .range(offset, offset + chunkSize - 1);
      
    if (!data || data.length === 0) break;
    
    // Search in memory
    const matches = data.filter(p => 
      p.sequence && p.sequence.includes(searchSeq)
    );
    
    results.push(...matches);
    offset += chunkSize;
  }
  
  return results.slice(0, 20);
}
```

## 3. **Use SQLite for Local Search**
Download data and search locally:
```javascript
// One-time: Export data
const downloadProteins = async () => {
  const allData = [];
  let offset = 0;
  
  while (true) {
    const { data } = await supabase
      .from('proteins')
      .select('id, accession, sequence')
      .range(offset, offset + 10000);
      
    if (!data || data.length === 0) break;
    allData.push(...data);
    offset += 10000;
  }
  
  // Save to SQLite or IndexedDB
  // Then search locally without API limits
};
```

## 4. **Pre-computed Sequence Patterns**
Create a pattern matching table:
```sql
CREATE TABLE sequence_patterns (
  pattern VARCHAR(10) PRIMARY KEY,
  protein_ids INTEGER[]
);

-- Pre-compute common patterns
INSERT INTO sequence_patterns 
SELECT 
  substring(sequence, 1, 5) as pattern,
  array_agg(id) as protein_ids
FROM proteins
GROUP BY substring(sequence, 1, 5);
```

## 5. **Use Browser-Based Search**
Implement search in the browser using:
- **IndexedDB** - Store sequences locally
- **Web Workers** - Search without blocking UI
- **WASM** - Use compiled search algorithms

Example with IndexedDB:
```javascript
// Store sequences in IndexedDB
const db = await openDB('proteins', 1, {
  upgrade(db) {
    const store = db.createObjectStore('sequences', { keyPath: 'id' });
    store.createIndex('seq5', 'seq5'); // First 5 chars
  }
});

// Batch import
async function importToIndexedDB() {
  const tx = db.transaction('sequences', 'readwrite');
  let offset = 0;
  
  while (true) {
    const { data } = await supabase
      .from('proteins')
      .select('*')
      .range(offset, offset + 1000);
      
    if (!data) break;
    
    for (const protein of data) {
      tx.store.add({
        ...protein,
        seq5: protein.sequence?.substring(0, 5)
      });
    }
    
    offset += 1000;
  }
}
```

## 6. **Static Site Generation**
For read-only data, generate static JSON files:
```javascript
// Build time: Generate index files
const sequences = await getAllSequences();
const index = {};

sequences.forEach(seq => {
  const prefix = seq.sequence.substring(0, 5);
  if (!index[prefix]) index[prefix] = [];
  index[prefix].push(seq.id);
});

// Save as static JSON files
// seq_index_AAAAA.json, seq_index_AAAAC.json, etc.
```

## 7. **Hybrid Approach** (Best Performance)
Combine multiple strategies:
1. Use prefix columns for fast initial filtering
2. Load results in small batches
3. Do final filtering client-side
4. Cache results aggressively

## Cost Comparison
- **Supabase Free**: 500MB database, 2GB transfer/month
- **Prefix columns**: ~100MB extra storage (affordable)
- **Client-side**: Uses user's resources (free)
- **Static files**: Can use free CDN (Netlify/Vercel)

The prefix column approach is the best balance of performance and cost for your use case.