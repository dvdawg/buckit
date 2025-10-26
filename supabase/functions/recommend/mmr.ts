export function mmrSelect<T extends { embedding?: number[]; score: number }>(
  candidates: T[], k: number, lambda = 0.7
): T[] {
  const selected: T[] = [];
  const pool = [...candidates].sort((a,b)=>b.score - a.score).slice(0, 120);
  
  while (selected.length < k && pool.length) {
    let bestIdx = 0, best = -Infinity;
    
    for (let i=0; i<pool.length; i++){
      const c = pool[i];
      const simToUser = c.score;
      const simToSel = selected.length
        ? Math.max(...selected.map(s => cosine(c.embedding, s.embedding)))
        : 0;
      const s = lambda*simToUser - (1-lambda)*simToSel;
      if (s > best){ 
        best = s; 
        bestIdx = i; 
      }
    }
    selected.push(pool.splice(bestIdx,1)[0]);
  }
  
  return selected;
}

function cosine(a?: number[], b?: number[]) {
  if (!a || !b) return 0;
  let s=0, na=0, nb=0;
  for (let i=0; i<Math.min(a.length,b.length); i++){ 
    s+=a[i]*b[i]; 
    na+=a[i]*a[i]; 
    nb+=b[i]*b[i]; 
  }
  return s / (Math.sqrt(na)*Math.sqrt(nb) + 1e-8);
}
