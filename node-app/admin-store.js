import {mkdirSync, realpathSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {AdminError,outsidePublicDirectory} from './admin-auth.js';
import {isUnapprovedArtworkDraft} from './artwork-concepts.js';

export function openAdminStore(directory, publicDir) {
  mkdirSync(directory,{recursive:true,mode:0o700});
  const resolved=realpathSync(directory),publicPath=realpathSync(publicDir);
  if(!outsidePublicDirectory(resolved,publicPath))throw Error('Admin data must not resolve inside public assets.');
  const db=new DatabaseSync(join(resolve(resolved),'artwork.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS artwork (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL, image BLOB);
    CREATE TABLE IF NOT EXISTS audit (sequence INTEGER PRIMARY KEY AUTOINCREMENT, artwork_id TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, recorded_at TEXT NOT NULL, revision INTEGER NOT NULL, details TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS artwork_sources (source_key TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS planner_batches (batch_key TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS planner_reviews (batch_key TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS planner_usage (day TEXT PRIMARY KEY, calls INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS planner_instructions (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, instructions TEXT NOT NULL, actor TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS planner_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, lease_owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0);
    INSERT OR IGNORE INTO planner_state (id,data) VALUES (1,'{}');`);
  const record=(id,action,actor,data)=>db.prepare('INSERT INTO audit (artwork_id,action,actor,recorded_at,revision,details) VALUES (?,?,?,?,?,?)')
    .run(id,action,actor,new Date().toISOString(),data.revision,JSON.stringify(data));
  const get=id=>{
    const row=db.prepare('SELECT data,image FROM artwork WHERE id=?').get(id);
    if(!row)throw new AdminError(404,'Not found');
    return {data:JSON.parse(row.data),image:row.image?Buffer.from(row.image):null};
  };
  const transaction=operation=>{
    db.exec('BEGIN IMMEDIATE');
    try {const result=operation();db.exec('COMMIT');return result;}
    catch(error){db.exec('ROLLBACK');throw error;}
  };
  const checkCapacity=count=>{
    if(db.prepare('SELECT COUNT(*) AS count FROM artwork').get().count+count>500)throw new AdminError(409,'Artwork queue is full. Archive management is required before adding more drafts.');
  };
  const insert=(data,actor,action='create')=>{
    const entry={...data,id:randomUUID(),revision:1,createdAt:new Date().toISOString()};
    db.prepare('INSERT INTO artwork (id,revision,data) VALUES (?,?,?)').run(entry.id,entry.revision,JSON.stringify(entry));
    record(entry.id,action,actor,entry);return entry;
  };
  const update=(id,revision,actor,action,change)=>{
    const current=get(id);
    if(current.data.revision!==revision)throw new AdminError(409,'This draft changed. Reload it before continuing.');
    const next=change(current);
    next.data={...next.data,id,revision:revision+1};
    db.prepare('UPDATE artwork SET revision=?,data=?,image=? WHERE id=?').run(next.data.revision,JSON.stringify(next.data),next.image,id);
    record(id,action,actor,next.data);return next.data;
  };
  return {
    close:()=>db.close(),
    list:()=>db.prepare('SELECT data FROM artwork ORDER BY rowid DESC LIMIT 500').all().map(row=>JSON.parse(row.data)),
    get,
    requireArtworkCapacity:checkCapacity,
    create:(data,actor)=>transaction(()=>{
      checkCapacity(1);return insert(data,actor);
    }),
    update:(...args)=>transaction(()=>update(...args)),
    regenerateDrafts:(targets,concepts,actor='automation:gemini')=>transaction(()=>{
      for(const target of targets)update(target.id,target.revision,actor,'regenerate-concept',current=>{
        if(!isUnapprovedArtworkDraft(current.data)||current.image)
          throw new AdminError(409,'A draft was approved or changed while AI was working. No drafts for this subject were replaced.');
        const replacement=concepts.find(concept=>concept.meetingId===current.data.meetingId&&concept.partId===current.data.partId&&concept.style===current.data.style);
        if(!replacement)throw new AdminError(409,'AI did not return a matching style. No drafts for this subject were replaced.');
        return {data:{...replacement,createdAt:current.data.createdAt},image:null};
      });
      return targets.length;
    }),
    audit:id=>db.prepare('SELECT action,actor,recorded_at AS recordedAt,revision FROM audit WHERE artwork_id=? ORDER BY sequence DESC LIMIT 100').all(id),
    sources:()=>db.prepare('SELECT data FROM artwork_sources ORDER BY source_key').all().map(row=>JSON.parse(row.data)),
    saveSources:items=>transaction(()=>{
      for(const item of items)db.prepare('INSERT INTO artwork_sources (source_key,data) VALUES (?,?) ON CONFLICT(source_key) DO UPDATE SET data=excluded.data')
        .run(`${item.meetingId}/${item.partId}`,JSON.stringify(item));
    }),
    hasPlannerBatch:key=>Boolean(db.prepare('SELECT batch_key FROM planner_batches WHERE batch_key=?').get(key)),
    plannerReview:key=>{
      const row=db.prepare('SELECT data FROM planner_reviews WHERE batch_key=?').get(key);
      return row?JSON.parse(row.data):null;
    },
    savePlannerReview:(key,issue)=>db.prepare('INSERT INTO planner_reviews (batch_key,data) VALUES (?,?) ON CONFLICT(batch_key) DO UPDATE SET data=excluded.data')
      .run(key,JSON.stringify(issue)),
    createPlanned:(key,concepts,actor='automation:gemini')=>transaction(()=>{
      if(db.prepare('SELECT batch_key FROM planner_batches WHERE batch_key=?').get(key))return false;
      checkCapacity(concepts.length);
      for(const concept of concepts)insert(concept,actor,'generate-concept');
      db.prepare('INSERT INTO planner_batches (batch_key) VALUES (?)').run(key);
      return true;
    }),
    plannerCalls:day=>db.prepare('SELECT calls FROM planner_usage WHERE day=?').get(day)?.calls??0,
    plannerInstructions:()=>db.prepare('SELECT revision,instructions,actor,updated_at AS updatedAt FROM planner_instructions WHERE id=1').get()??null,
    savePlannerInstructions:(instructions,revision,actor)=>transaction(()=>{
      const current=db.prepare('SELECT revision FROM planner_instructions WHERE id=1').get();
      if((current?.revision??0)!==revision)throw new AdminError(409,'Planning instructions changed. Reload them before saving.');
      db.prepare('INSERT INTO planner_instructions (id,revision,instructions,actor,updated_at) VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,instructions=excluded.instructions,actor=excluded.actor,updated_at=excluded.updated_at')
        .run(revision+1,instructions,actor,new Date().toISOString());
    }),
    reservePlannerCall:(day,max)=>transaction(()=>{
      const count=db.prepare('SELECT calls FROM planner_usage WHERE day=?').get(day)?.calls??0;
      if(count>=max)return false;
      db.prepare('INSERT INTO planner_usage (day,calls) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1').run(day);
      return true;
    }),
    plannerState:()=>{
      const row=db.prepare('SELECT data,lease_owner,lease_until FROM planner_state WHERE id=1').get();
      return {...JSON.parse(row.data),leaseUntil:row.lease_until};
    },
    claimPlanner:(now,force)=>transaction(()=>{
      const row=db.prepare('SELECT data,lease_until FROM planner_state WHERE id=1').get(),data=JSON.parse(row.data);
      if(row.lease_until>now||!force&&Date.parse(data.nextCheckAt)>now)return null;
      const owner=randomUUID();
      db.prepare('UPDATE planner_state SET lease_owner=?,lease_until=?,data=? WHERE id=1')
        .run(owner,now+20*60*1000,JSON.stringify({...data,lastStartedAt:new Date(now).toISOString()}));
      return owner;
    }),
    finishPlanner:(owner,result)=>{
      if(!db.prepare('UPDATE planner_state SET data=?,lease_owner=NULL,lease_until=0 WHERE id=1 AND lease_owner=?').run(JSON.stringify(result),owner).changes)
        throw Error('Artwork planner lease was lost; inspect its last run before retrying.');
    }
  };
}
