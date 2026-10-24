import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const digest = value => createHash('sha256').update(String(value)).digest('hex');
const cookie = (req, name) => String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const fail = (status, message) => Object.assign(new Error(message), { status });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const normalized = value => String(value || '').trim().toLowerCase();
const validPassword = value => typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72;
const safeEqual = (a, b) => timingSafeEqual(Buffer.from(digest(a), 'hex'), Buffer.from(digest(b), 'hex'));
const MODES = ['AVIATOR','ROULETTE','SUPER_OVER','COLOR_PREDICTION','DRAGON_TIGER','ANDAR_BAHAR','LUCKY_SEVEN','DEAL_OR_NO_DEAL','SPORTS_API'];
const SOURCE_COLUMNS = ['source_key','game','customer_id','parent_id','match_name','selection','stake','held','rate','status','result','payout','created_at','settled_at','extra'];
const sourceId = "b.id::TEXT";
const netResult = (held, returned) => `CASE WHEN ${returned}>${held} THEN 'WIN' WHEN ${returned}=${held} THEN 'REFUND' ELSE 'LOSS' END`;

// Views expose accepted selections and revealed results only, never seeds or hidden plans.
const SOURCES = [
  {table:'tsb_flight_bets',parent:'tsb_flight_rounds',key:'id',sql:`SELECT ${sourceId} AS source_key,'AVIATOR'::TEXT AS game,b.customer_id,b.round_id::TEXT AS parent_id,
    'Round #'||b.round_id AS match_name,'Bet box '||b.bet_slot AS selection,b.stake,b.stake AS held,
    CASE WHEN b.cashout_hundredths IS NOT NULL THEN (b.cashout_hundredths::NUMERIC/100)::TEXT||'x' ELSE '' END AS rate,b.status,
    CASE WHEN b.status='CANCELLED' THEN 'REFUND' WHEN r.status='CRASHED' AND b.status='CASHED_OUT' THEN 'WIN' WHEN r.status='CRASHED' AND b.status='LOST' THEN 'LOSS' END::TEXT AS result,
    CASE WHEN b.status='CANCELLED' OR (r.status='CRASHED' AND b.status IN ('CASHED_OUT','LOST')) THEN b.payout END AS payout,
    b.created_at,CASE WHEN b.status='CANCELLED' OR r.status='CRASHED' THEN b.settled_at END AS settled_at,
    jsonb_build_object('slot',b.bet_slot,'cashoutMultiplier',b.cashout_hundredths::NUMERIC/100) AS extra
    FROM tsb_flight_bets b JOIN tsb_flight_rounds r ON r.id=b.round_id`},
  {table:'tsb_roulette_bets',parent:'tsb_roulette_rounds',key:'round_id,customer_id',sql:`SELECT b.round_id::TEXT||':'||b.customer_id AS source_key,'ROULETTE'::TEXT AS game,b.customer_id,b.round_id::TEXT AS parent_id,
    'Round #'||b.round_id AS match_name,b.bets::TEXT AS selection,b.total AS stake,b.total AS held,''::TEXT AS rate,b.status,
    CASE WHEN b.total=0 THEN 'REFUND' WHEN b.status='SETTLED' THEN ${netResult('b.total','b.payout')} END::TEXT AS result,
    CASE WHEN b.total=0 THEN 0 WHEN b.status='SETTLED' THEN b.payout END AS payout,b.created_at,NULL::TIMESTAMPTZ AS settled_at,
    jsonb_build_object('revision',b.revision,'selections',b.bets,'resultNumber',CASE WHEN r.status='SETTLED' THEN r.number END) AS extra
    FROM tsb_roulette_bets b JOIN tsb_roulette_rounds r ON r.id=b.round_id`},
  {table:'tsb_auto_bets',parent:'tsb_auto_rounds',key:'id',sql:`SELECT ${sourceId} AS source_key,
    CASE r.game WHEN 'super-over' THEN 'SUPER_OVER' WHEN 'dragon-tiger' THEN 'DRAGON_TIGER' WHEN 'andar-bahar' THEN 'ANDAR_BAHAR' WHEN 'lucky-seven' THEN 'LUCKY_SEVEN' END::TEXT AS game,
    b.customer_id,b.round_id::TEXT AS parent_id,'Round #'||b.round_id AS match_name,b.direction||' · '||b.market AS selection,b.amount AS stake,b.hold AS held,''::TEXT AS rate,b.status,
    CASE WHEN b.status='CANCELLED' THEN 'REFUND' WHEN b.status='SETTLED' THEN ${netResult('b.hold','b.payout')} END::TEXT AS result,
    CASE WHEN b.status='CANCELLED' THEN b.hold WHEN b.status='SETTLED' THEN b.payout END AS payout,b.created_at,NULL::TIMESTAMPTZ AS settled_at,
    jsonb_build_object('direction',b.direction,'stage',b.stage,'market',b.market,'winner',CASE WHEN r.settled THEN r.outcome->'winner' END) AS extra
    FROM tsb_auto_bets b JOIN tsb_auto_rounds r ON r.id=b.round_id`},
  {table:'tsb_color_bets',parent:'tsb_color_rounds',key:'id',sql:`SELECT ${sourceId} AS source_key,'COLOR_PREDICTION'::TEXT AS game,b.customer_id,b.round_id::TEXT AS parent_id,
    r.mode||' · Period '||r.period AS match_name,b.market AS selection,b.amount AS stake,b.amount AS held,''::TEXT AS rate,b.status,
    CASE b.status WHEN 'WON' THEN 'WIN' WHEN 'LOST' THEN 'LOSS' WHEN 'CANCELLED' THEN 'REFUND' END::TEXT AS result,
    CASE WHEN b.status<>'PLACED' THEN b.payout END AS payout,b.created_at,b.settled_at,
    jsonb_build_object('mode',r.mode,'period',r.period,'market',b.market,'resultNumber',CASE WHEN r.settled THEN r.result_number END) AS extra
    FROM tsb_color_bets b JOIN tsb_color_rounds r ON r.id=b.round_id`},
  {table:'tsb_deal_entries',parent:'tsb_deal_sessions',key:'id',choice:true,sql:`SELECT ${sourceId} AS source_key,'DEAL_OR_NO_DEAL'::TEXT AS game,b.customer_id,b.session_id::TEXT AS parent_id,
    'Session #'||b.session_id AS match_name,COALESCE((SELECT string_agg('L'||c.level||': Case '||c.case_number,', ' ORDER BY c.level) FROM tsb_deal_choices c WHERE c.entry_id=b.id),'Joining') AS selection,
    b.stake,b.stake AS held,''::TEXT AS rate,b.status,
    CASE WHEN b.status='CANCELLED' THEN 'REFUND' WHEN b.status='LOST' THEN 'LOSS' WHEN b.status='COLLECTED' THEN ${netResult('b.stake','b.payout')} END::TEXT AS result,
    CASE WHEN b.status IN ('CANCELLED','LOST','COLLECTED') THEN b.payout END AS payout,b.created_at,
    CASE WHEN b.status IN ('CANCELLED','LOST','COLLECTED') THEN b.updated_at END AS settled_at,
    jsonb_build_object('completedLevel',b.completed_level) AS extra
    FROM tsb_deal_entries b JOIN tsb_deal_sessions r ON r.id=b.session_id`},
  {table:'tsb_so_manual_bets',parent:'tsb_so_manual_matches',key:'id',sql:`SELECT ${sourceId} AS source_key,'SUPER_OVER'::TEXT AS game,b.customer_id,b.match_id::TEXT AS parent_id,
    (r.teams->>0)||' vs '||(r.teams->>1)||' · M'||r.id AS match_name,b.direction||' · '||(r.teams->>b.team) AS selection,
    b.amount AS stake,b.hold AS held,b.points::TEXT||' points' AS rate,b.status,
    CASE WHEN b.status='SETTLED' THEN ${netResult('b.hold','b.payout')} END::TEXT AS result,
    CASE WHEN b.status='SETTLED' THEN b.payout END AS payout,b.created_at,NULL::TIMESTAMPTZ AS settled_at,
    jsonb_build_object('kind','CONTROLLED','team',b.team,'direction',b.direction,'window',b.window_id) AS extra
    FROM tsb_so_manual_bets b JOIN tsb_so_manual_matches r ON r.id=b.match_id`},
  {table:'tsb_so_bets',parent:'tsb_so_matches',key:'id',optional:true,sql:`SELECT b.id::TEXT AS source_key,'SUPER_OVER'::TEXT AS game,b.customer_id,b.match_id::TEXT AS parent_id,
    'Legacy Super Over #'||b.match_id AS match_name,COALESCE(to_jsonb(b)->>'direction','')||' · Team '||COALESCE(to_jsonb(b)->>'team','') AS selection,
    COALESCE((to_jsonb(b)->>'amount')::INTEGER,(to_jsonb(b)->>'stake')::INTEGER,0) AS stake,
    COALESCE((to_jsonb(b)->>'hold')::INTEGER,(to_jsonb(b)->>'amount')::INTEGER,(to_jsonb(b)->>'stake')::INTEGER,0) AS held,
    COALESCE(to_jsonb(b)->>'points','') AS rate,b.status,
    CASE WHEN b.status='CANCELLED' THEN 'REFUND' WHEN b.status='SETTLED' THEN
      CASE WHEN b.payout>COALESCE((to_jsonb(b)->>'hold')::INTEGER,(to_jsonb(b)->>'amount')::INTEGER,0) THEN 'WIN'
        WHEN b.payout=COALESCE((to_jsonb(b)->>'hold')::INTEGER,(to_jsonb(b)->>'amount')::INTEGER,0) THEN 'REFUND' ELSE 'LOSS' END END::TEXT AS result,
    CASE WHEN b.status='SETTLED' THEN b.payout WHEN b.status='CANCELLED' THEN COALESCE((to_jsonb(b)->>'hold')::INTEGER,(to_jsonb(b)->>'amount')::INTEGER,0) END AS payout,
    (to_jsonb(b)->>'created_at')::TIMESTAMPTZ AS created_at,(to_jsonb(b)->>'settled_at')::TIMESTAMPTZ AS settled_at,
    jsonb_build_object('kind','LEGACY') AS extra FROM tsb_so_bets b JOIN tsb_so_matches r ON r.id=b.match_id`},
  {table:'demo_bets',key:'id',sql:`SELECT ${sourceId} AS source_key,'SPORTS_API'::TEXT AS game,b.customer_id,b.match_id::TEXT AS parent_id,
    b.match_name,b.market||' · '||b.selection||' · '||b.bet_type AS selection,b.stake,b.stake AS held,b.rate,b.status,
    CASE WHEN b.status='SETTLED' THEN CASE b.result WHEN 'WON' THEN 'WIN' WHEN 'LOST' THEN 'LOSS' WHEN 'VOID' THEN 'VOID' ELSE NULL END END::TEXT AS result,
    CASE WHEN b.status='SETTLED' THEN b.payout END AS payout,b.created_at,b.settled_at,
    jsonb_build_object('marketId',b.market_id,'market',b.market,'selection',b.selection,'betType',b.bet_type,'payoutRate',b.payout_rate) AS extra
    FROM demo_bets b`},
];

async function transaction(pool,fn) {
  const client=await pool.connect();
  try {await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function initializePlayingHistory(pool) {
  return transaction(pool,async client=>{
    await client.query('SELECT pg_advisory_xact_lock(746298)');
    for (const id of [746219,746220,746225,746226,746238,746239]) await client.query('SELECT pg_advisory_xact_lock($1)',[id]);
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS tsb_playing_bet_no START WITH 1000 MINVALUE 1000;
      CREATE TABLE IF NOT EXISTS tsb_playing_history(
        bet_no BIGINT PRIMARY KEY DEFAULT nextval('tsb_playing_bet_no'),source TEXT NOT NULL,source_key TEXT NOT NULL,
        game TEXT NOT NULL,customer_id INTEGER NOT NULL REFERENCES customers(id),parent_id TEXT NOT NULL,
        match_name TEXT NOT NULL,selection TEXT NOT NULL,stake INTEGER NOT NULL,held INTEGER NOT NULL,rate TEXT NOT NULL,
        status TEXT NOT NULL,result TEXT,payout INTEGER,created_at TIMESTAMPTZ,settled_at TIMESTAMPTZ,
        extra JSONB NOT NULL DEFAULT '{}',version INTEGER NOT NULL DEFAULT 1,updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        UNIQUE(source,source_key));
      CREATE INDEX IF NOT EXISTS tsb_history_game_no ON tsb_playing_history(game,bet_no DESC);
      CREATE INDEX IF NOT EXISTS tsb_history_customer_no ON tsb_playing_history(customer_id,bet_no DESC);
      CREATE TABLE IF NOT EXISTS tsb_history_changes(
        id BIGSERIAL PRIMARY KEY,bet_no BIGINT NOT NULL,old_value JSONB,new_value JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp());
      CREATE TABLE IF NOT EXISTS tsb_history_admins(
        id BIGSERIAL PRIMARY KEY,name VARCHAR(100) NOT NULL,login_id VARCHAR(30) UNIQUE NOT NULL,password_hash TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,can_view BOOLEAN NOT NULL DEFAULT TRUE,can_settle BOOLEAN NOT NULL DEFAULT FALSE,
        must_change_password BOOLEAN NOT NULL DEFAULT TRUE,auth_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS tsb_history_admin_sessions(
        token_hash TEXT PRIMARY KEY,account_id BIGINT NOT NULL REFERENCES tsb_history_admins(id),auth_version INTEGER NOT NULL,expires_at TIMESTAMPTZ NOT NULL);
      CREATE TABLE IF NOT EXISTS tsb_history_admin_audit(
        id BIGSERIAL PRIMARY KEY,actor TEXT NOT NULL,account_id BIGINT NOT NULL,action TEXT NOT NULL,details JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS tsb_sports_manual_settlements(
        bet_id BIGINT PRIMARY KEY REFERENCES demo_bets(id),actor TEXT NOT NULL,request_key TEXT NOT NULL,
        outcome TEXT NOT NULL CHECK(outcome IN ('WON','LOST','VOID')),reason TEXT NOT NULL,evidence TEXT NOT NULL,
        payout INTEGER NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(actor,request_key));
      CREATE OR REPLACE FUNCTION tsb_ph_notify() RETURNS trigger AS $$
      BEGIN
        INSERT INTO tsb_history_changes(bet_no,old_value,new_value)
        VALUES(NEW.bet_no,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
        PERFORM pg_notify('tsb_playing_history','refresh');RETURN NEW;
      END;$$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS tsb_ph_notify_row ON tsb_playing_history;
      CREATE TRIGGER tsb_ph_notify_row AFTER INSERT OR UPDATE ON tsb_playing_history FOR EACH ROW EXECUTE FUNCTION tsb_ph_notify();
      CREATE OR REPLACE FUNCTION tsb_ph_refresh(view_name TEXT,src TEXT,key_name TEXT,key_value TEXT,backfill BOOLEAN DEFAULT FALSE)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE format('UPDATE tsb_playing_history h SET
          game=p.game,customer_id=p.customer_id,parent_id=p.parent_id,match_name=p.match_name,selection=p.selection,
          stake=p.stake,held=p.held,rate=p.rate,status=p.status,result=p.result,payout=p.payout,
          settled_at=CASE WHEN p.result IS NULL THEN NULL ELSE COALESCE(p.settled_at,h.settled_at,CASE WHEN NOT $3 THEN clock_timestamp() END) END,
          extra=p.extra,version=h.version+1,updated_at=clock_timestamp()
          FROM %I p WHERE h.source=$1 AND h.source_key=p.source_key AND ($2 IS NULL OR p.%I=$2)
          AND ROW(h.game,h.customer_id,h.parent_id,h.match_name,h.selection,h.stake,h.held,h.rate,h.status,h.result,h.payout,h.extra)
          IS DISTINCT FROM ROW(p.game,p.customer_id,p.parent_id,p.match_name,p.selection,p.stake,p.held,p.rate,p.status,p.result,p.payout,p.extra)',view_name,key_name)
          USING src,key_value,backfill;
        EXECUTE format('INSERT INTO tsb_playing_history(source,source_key,game,customer_id,parent_id,match_name,selection,stake,held,rate,status,result,payout,created_at,settled_at,extra)
          SELECT $1,p.source_key,p.game,p.customer_id,p.parent_id,p.match_name,p.selection,p.stake,p.held,p.rate,p.status,p.result,p.payout,p.created_at,
          CASE WHEN p.result IS NULL THEN NULL ELSE COALESCE(p.settled_at,CASE WHEN NOT $3 THEN clock_timestamp() END) END,p.extra
          FROM %I p WHERE ($2 IS NULL OR p.%I=$2) AND NOT EXISTS(SELECT 1 FROM tsb_playing_history h WHERE h.source=$1 AND h.source_key=p.source_key)
          ORDER BY p.created_at NULLS FIRST,p.source_key ON CONFLICT(source,source_key) DO NOTHING',view_name,key_name)
          USING src,key_value,backfill;
      END;$$ LANGUAGE plpgsql;
      CREATE OR REPLACE FUNCTION tsb_ph_source_trigger() RETURNS trigger AS $$
      DECLARE key_value TEXT;part TEXT;row_json JSONB;
      BEGIN
        row_json:=to_jsonb(NEW);key_value:='';
        FOREACH part IN ARRAY string_to_array(TG_ARGV[3],',') LOOP
          IF key_value<>'' THEN key_value:=key_value||':' ;END IF;
          key_value:=key_value||(row_json->>part);
        END LOOP;
        PERFORM tsb_ph_refresh(TG_ARGV[0],TG_ARGV[1],TG_ARGV[2],key_value,FALSE);RETURN NEW;
      END;$$ LANGUAGE plpgsql;
    `);
    const installed=[];
    for(const source of SOURCES){
      const found=(await client.query('SELECT to_regclass($1) AS name',[`public.${source.table}`])).rows[0]?.name;
      if(!found){if(source.optional)continue;throw fail(503,`History requires initialized table: ${source.table}`);}
      installed.push(source);
    }
    // A single migration transaction blocks writes while views/triggers/backfill are installed.
    for(const source of [...installed].sort((a,b)=>a.table.localeCompare(b.table))) {
      await client.query(`LOCK TABLE ${source.table} IN SHARE ROW EXCLUSIVE MODE`);
      if(source.parent)await client.query(`LOCK TABLE ${source.parent} IN SHARE ROW EXCLUSIVE MODE`);
    }
    if(installed.some(source=>source.table==='tsb_roulette_bets')){
      // Older roulette rows have no accepted-at timestamp. Preserve unknown as NULL.
      await client.query('ALTER TABLE tsb_roulette_bets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ');
      await client.query('ALTER TABLE tsb_roulette_bets ALTER COLUMN created_at SET DEFAULT clock_timestamp()');
    }
    for(const source of installed){
      const view=`tsb_ph_${source.table}`;
      await client.query(`CREATE OR REPLACE VIEW ${view} AS ${source.sql}`);
      await client.query(`DROP TRIGGER IF EXISTS tsb_ph_bet_sync ON ${source.table};
        CREATE TRIGGER tsb_ph_bet_sync AFTER INSERT OR UPDATE ON ${source.table} FOR EACH ROW
        EXECUTE FUNCTION tsb_ph_source_trigger('${view}','${source.table}','source_key','${source.key}');`);
      if(source.parent)await client.query(`DROP TRIGGER IF EXISTS tsb_ph_parent_${source.table} ON ${source.parent};
        CREATE TRIGGER tsb_ph_parent_${source.table} AFTER UPDATE ON ${source.parent} FOR EACH ROW
        EXECUTE FUNCTION tsb_ph_source_trigger('${view}','${source.table}','parent_id','id');`);
      if(source.choice)await client.query(`DROP TRIGGER IF EXISTS tsb_ph_choice_sync ON tsb_deal_choices;
        CREATE TRIGGER tsb_ph_choice_sync AFTER INSERT OR UPDATE ON tsb_deal_choices FOR EACH ROW
        EXECUTE FUNCTION tsb_ph_source_trigger('${view}','${source.table}','source_key','entry_id');`);
    }
    if(installed.length){
      // One ordered backfill across all games, not a separate numbering sequence per tab.
      const union=installed.map(source=>`SELECT '${source.table}'::TEXT AS source,${SOURCE_COLUMNS.join(',')} FROM tsb_ph_${source.table}`).join(' UNION ALL ');
      await client.query(`INSERT INTO tsb_playing_history(source,${SOURCE_COLUMNS.join(',')}) SELECT p.source,${SOURCE_COLUMNS.map(key=>`p.${key}`).join(',')}
        FROM (${union}) p WHERE NOT EXISTS(SELECT 1 FROM tsb_playing_history h WHERE h.source=p.source AND h.source_key=p.source_key)
        ORDER BY p.created_at NULLS FIRST,p.source,p.source_key ON CONFLICT(source,source_key) DO NOTHING`);
    }
    return installed.map(source=>source.table);
  });
}

const accountView=row=>({id:String(row.id),name:row.name,loginId:row.login_id,active:row.active,canView:row.can_view,canSettle:row.can_settle,
  mustChangePassword:row.must_change_password,version:Number(row.auth_version),createdAt:row.created_at});
const actorView=actor=>({username:actor.loginId,name:actor.name,role:'ADMIN',isAuthenticated:true,historyOnly:!actor.main,
  mustChangePassword:actor.mustChangePassword,permissions:{viewHistory:actor.canView,settleSports:actor.canSettle,manageHistoryAdmins:actor.main}});

async function readActor(connection,req,lock=false) {
  const mainToken=cookie(req,'tsb_old_admin'),mainId=String(process.env.ADMIN_LOGIN_ID||'').trim(),password=String(process.env.ADMIN_LOGIN_PASSWORD||'');
  if(/^[a-f0-9]{64}$/.test(mainToken)&&mainId&&validPassword(password)){
    const row=(await connection.query(`SELECT admin_id FROM tsb_admin_sessions WHERE token_hash=$1 AND expires_at>clock_timestamp() AND credential_fingerprint=$2${lock?' FOR SHARE':''}`,
      [digest(mainToken),digest(`${mainId}:${password}`)])).rows[0];
    if(row)return {main:true,id:row.admin_id,loginId:row.admin_id,name:row.admin_id,canView:true,canSettle:true,mustChangePassword:false,key:`main:${row.admin_id}`};
  }
  const token=cookie(req,'tsb_history_admin');
  if(!/^[a-f0-9]{64}$/.test(token))throw fail(401,'Admin login required.');
  const row=(await connection.query(`SELECT a.* FROM tsb_history_admin_sessions s JOIN tsb_history_admins a ON a.id=s.account_id
    WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND s.auth_version=a.auth_version AND a.active=TRUE${lock?' FOR SHARE OF a,s':''}`,[digest(token)])).rows[0];
  if(!row)throw fail(401,'Admin session expired or permissions changed. Login again.');
  return {main:false,id:String(row.id),loginId:row.login_id,name:row.name,canView:row.can_view,canSettle:row.can_settle,
    mustChangePassword:row.must_change_password,key:`history:${row.id}`};
}
async function issueSession(connection,res,row){
  const token=randomBytes(32).toString('hex');
  await connection.query("INSERT INTO tsb_history_admin_sessions(token_hash,account_id,auth_version,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '8 hours')",[digest(token),row.id,row.auth_version]);
  res.cookie('tsb_history_admin',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*3600000});
}

export function registerPlayingHistoryRoutes(app,pool) {
  let readiness=null,broker=null,connecting=false;
  const clients=new Set();
  async function startBroker(){
    if(broker||connecting||typeof pool.on!=='function')return;
    connecting=true;let connection;
    try{
      connection=await pool.connect();await connection.query('LISTEN tsb_playing_history');broker=connection;
      connection.on('notification',notice=>{if(notice.channel==='tsb_playing_history')for(const res of clients){try{res.write('data: {"type":"refresh"}\n\n');}catch{clients.delete(res);}}});
      connection.on('error',()=>{broker=null;connection.release(true);for(const res of clients)res.end();clients.clear();});
    }catch{if(connection)connection.release(true);}finally{connecting=false;}
  }
  const ensure=()=>{
    if(!readiness)readiness=initializePlayingHistory(pool).then(result=>{void startBroker();return result;}).catch(error=>{readiness=null;throw error;});
    return readiness;
  };
  // registerControllerAccountRoutes installs this first. The server listens only
  // after all game initializers finish, so every API mutation waits for capture.
  app.use('/api',wrap(async(req,res,next)=>{await ensure();next();}));
  const origin=(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(req.method!=='GET'&&req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)throw Error();}catch{return next(fail(403,'Invalid request origin.'));}}
    next();
  };
  app.use('/api/playing-history',origin);
  const guard=(permission='view')=>wrap(async(req,res,next)=>{
    const actor=await readActor(pool,req);req.historyActor=actor;
    if(permission!=='password'&&actor.mustChangePassword)throw fail(403,'Change your temporary password before accessing history.');
    if(permission==='view'&&!actor.canView)throw fail(403,'History permission is not enabled.');
    if(permission==='main'&&!actor.main)throw fail(403,'Main Admin permission required.');
    if(permission==='settle'&&(!actor.canView||!actor.canSettle))throw fail(403,'Sports settlement permission is not enabled.');
    next();
  });
  const attempts=new Map();
  const limit=req=>{
    const time=Date.now();for(const [key,value]of attempts)if(value.until<time)attempts.delete(key);
    const key=String(req.ip||'unknown');const value=attempts.get(key)||{count:0,until:time+900000};
    if(value.count>=10)throw fail(429,'Too many login attempts. Try again in 15 minutes.');
    if(attempts.size>10000&&!attempts.has(key))throw fail(429,'Login busy. Try again later.');
    value.count++;attempts.set(key,value);return()=>attempts.delete(key);
  };
  // Intercept delegated admin login; ordinary Main Admin routes continue unchanged.
  app.post('/api/auth/admin-login',origin,wrap(async(req,res,next)=>{
    const name=normalized(req.body?.username),main=String(process.env.ADMIN_LOGIN_ID||'').trim();
    if(safeEqual(String(req.body?.username||'').trim(),main)){res.clearCookie('tsb_history_admin',{path:'/'});return next();}
    const reset=limit(req);
    const row=(await pool.query('SELECT * FROM tsb_history_admins WHERE login_id=$1',[name])).rows[0];
    if(!row)return next();
    const password=String(req.body?.password||'');
    if(!row.active||Buffer.byteLength(password,'utf8')>72||!(await bcrypt.compare(password,row.password_hash)))throw fail(401,'Invalid Admin ID or Password.');
    await transaction(pool,async client=>{
      const locked=(await client.query('SELECT * FROM tsb_history_admins WHERE id=$1 FOR UPDATE',[row.id])).rows[0];
      if(!locked?.active||locked.auth_version!==row.auth_version)throw fail(401,'Account changed. Login again.');
      await issueSession(client,res,locked);
      await client.query('DELETE FROM tsb_admin_sessions WHERE token_hash=$1',[digest(cookie(req,'tsb_old_admin'))]);
    });
    res.clearCookie('tsb_old_admin',{path:'/'});reset();
    res.json({success:true,admin:actorView({main:false,loginId:row.login_id,name:row.name,canView:row.can_view,canSettle:row.can_settle,mustChangePassword:row.must_change_password})});
  }));
  app.get('/api/auth/admin-session',wrap(async(req,res,next)=>{
    if(!cookie(req,'tsb_history_admin'))return next();
    const actor=await readActor(pool,req);res.json({success:true,admin:actorView(actor)});
  }));
  app.post('/api/auth/admin-logout',origin,wrap(async(req,res,next)=>{
    if(!cookie(req,'tsb_history_admin'))return next();
    await pool.query('DELETE FROM tsb_history_admin_sessions WHERE token_hash=$1',[digest(cookie(req,'tsb_history_admin'))]);
    await pool.query('DELETE FROM tsb_admin_sessions WHERE token_hash=$1',[digest(cookie(req,'tsb_old_admin'))]);
    res.clearCookie('tsb_history_admin',{path:'/'});res.clearCookie('tsb_old_admin',{path:'/'});res.json({success:true});
  }));
  app.get('/api/playing-history/me',guard('password'),(req,res)=>res.json({success:true,admin:actorView(req.historyActor)}));
  app.post('/api/playing-history/change-password',guard('password'),wrap(async(req,res)=>{
    const body=req.body||{};if(req.historyActor.main)throw fail(400,'Use the existing Main Admin password configuration.');
    if(!validPassword(body.newPassword)||body.newPassword!==body.confirmPassword||body.newPassword===body.currentPassword)throw fail(400,'Use a different 12+ character password, maximum 72 UTF-8 bytes, with matching confirmation.');
    const row=await transaction(pool,async client=>{
      const actor=await readActor(client,req,true);
      const row=(await client.query('SELECT * FROM tsb_history_admins WHERE id=$1 FOR UPDATE',[actor.id])).rows[0];
      if(!(await bcrypt.compare(String(body.currentPassword||''),row.password_hash)))throw fail(401,'Current password is incorrect.');
      const updated=(await client.query('UPDATE tsb_history_admins SET password_hash=$1,must_change_password=FALSE,auth_version=auth_version+1,updated_at=NOW() WHERE id=$2 RETURNING *',[await bcrypt.hash(body.newPassword,12),row.id])).rows[0];
      await client.query('DELETE FROM tsb_history_admin_sessions WHERE account_id=$1',[row.id]);await issueSession(client,res,updated);return updated;
    });
    res.json({success:true,admin:actorView({main:false,loginId:row.login_id,name:row.name,canView:row.can_view,canSettle:row.can_settle,mustChangePassword:false})});
  }));
  app.get('/api/playing-history/admins',guard('main'),wrap(async(req,res)=>{
    const result=await pool.query('SELECT * FROM tsb_history_admins ORDER BY id DESC');res.json({accounts:result.rows.map(accountView)});
  }));
  app.post('/api/playing-history/admins',guard('main'),wrap(async(req,res)=>{
    const body=req.body||{},name=String(body.name||'').trim(),loginId=normalized(body.loginId);
    if(!name||name.length>100||!/^[a-z0-9._-]{4,30}$/.test(loginId)||loginId===normalized(process.env.ADMIN_LOGIN_ID))throw fail(400,'Enter a name and a unique 4–30 character Admin ID.');
    if(!validPassword(body.temporaryPassword)||typeof body.canSettle!=='boolean')throw fail(400,'Use a 12+ character temporary password (maximum 72 UTF-8 bytes) and choose settlement permission.');
    const row=await transaction(pool,async client=>{
      const actor=await readActor(client,req,true);if(!actor.main)throw fail(403,'Main Admin required.');
      const row=(await client.query('INSERT INTO tsb_history_admins(name,login_id,password_hash,can_settle) VALUES($1,$2,$3,$4) RETURNING *',[name,loginId,await bcrypt.hash(body.temporaryPassword,12),body.canSettle])).rows[0];
      await client.query("INSERT INTO tsb_history_admin_audit(actor,account_id,action,details) VALUES($1,$2,'CREATE',$3)",[actor.key,row.id,JSON.stringify({canSettle:row.can_settle})]);return row;
    });res.status(201).json({account:accountView(row)});
  }));
  app.patch('/api/playing-history/admins/:id',guard('main'),wrap(async(req,res)=>{
    const body=req.body||{},id=String(req.params.id);
    if(!/^\d{1,18}$/.test(id)||!Number.isInteger(body.version)||typeof body.active!=='boolean'||typeof body.canView!=='boolean'||typeof body.canSettle!=='boolean'||(body.canSettle&&!body.canView))throw fail(400,'Choose valid account permissions and current version.');
    if(body.temporaryPassword&&!validPassword(body.temporaryPassword))throw fail(400,'Temporary password must be 12+ characters and at most 72 UTF-8 bytes.');
    const row=await transaction(pool,async client=>{
      const actor=await readActor(client,req,true);if(!actor.main)throw fail(403,'Main Admin required.');
      const row=(await client.query('SELECT * FROM tsb_history_admins WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!row)throw fail(404,'Admin account not found.');if(row.auth_version!==body.version)throw fail(409,'Account changed. Refresh first.');
      const updated=(await client.query(`UPDATE tsb_history_admins SET active=$1,can_view=$2,can_settle=$3,password_hash=$4,
        must_change_password=$5,auth_version=auth_version+1,updated_at=NOW() WHERE id=$6 RETURNING *`,
        [body.active,body.canView,body.canSettle,body.temporaryPassword?await bcrypt.hash(body.temporaryPassword,12):row.password_hash,body.temporaryPassword?true:row.must_change_password,id])).rows[0];
      await client.query('DELETE FROM tsb_history_admin_sessions WHERE account_id=$1',[id]);
      await client.query("INSERT INTO tsb_history_admin_audit(actor,account_id,action,details) VALUES($1,$2,'PERMISSIONS_OR_RESET',$3)",[actor.key,id,JSON.stringify({before:accountView(row),after:accountView(updated),passwordReset:Boolean(body.temporaryPassword)})]);return updated;
    });res.json({account:accountView(row)});
  }));
  app.get('/api/playing-history',guard(),wrap(async(req,res)=>{
    const game=String(req.query.game||'ALL'),search=String(req.query.search||'').trim().slice(0,100),result=String(req.query.result||'ALL');
    const before=String(req.query.before||''),date=String(req.query.date||'');
    if(!['ALL',...MODES].includes(game)||!['ALL','WAITING','WIN','LOSS','REFUND','VOID'].includes(result)|| (before&&!/^\d{1,18}$/.test(before))|| (date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||(!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))))throw fail(400,'Invalid history filters.');
    const rows=(await pool.query(`SELECT h.*,c.name AS customer_name,c.login_id FROM tsb_playing_history h JOIN customers c ON c.id=h.customer_id
      WHERE ($1='ALL' OR h.game=$1) AND ($2='' OR h.bet_no::TEXT=$2 OR POSITION(LOWER($2) IN LOWER(c.name||' '||c.login_id))>0)
      AND ($3='ALL' OR ($3='WAITING' AND h.result IS NULL) OR h.result=$3)
      AND ($4::BIGINT IS NULL OR h.bet_no<$4::BIGINT)
      AND ($5::DATE IS NULL OR (h.created_at AT TIME ZONE 'Asia/Kolkata')::DATE=$5::DATE)
      ORDER BY h.bet_no DESC LIMIT 101`,[game,search,result,before||null,date||null])).rows;
    const more=rows.length>100,items=rows.slice(0,100).map(row=>({betNo:String(row.bet_no),source:row.source,sourceKey:row.source_key,game:row.game,
      customerId:row.customer_id,customerName:row.customer_name,loginId:row.login_id,matchName:row.match_name,selection:row.selection,
      stake:Number(row.stake),held:Number(row.held),rate:row.rate,status:row.status,result:row.result,payout:row.payout==null?null:Number(row.payout),
      profitLoss:row.payout==null?null:Number(row.payout)-Number(row.held),createdAt:row.created_at,settledAt:row.settled_at,extra:row.extra,version:row.version,
      canSettle:req.historyActor.canSettle&&row.game==='SPORTS_API'&&row.result==null&&['MATCHED','UNMATCHED'].includes(row.status)}));
    res.json({items,nextBefore:more?items.at(-1).betNo:null,admin:actorView(req.historyActor)});
  }));
  app.get('/api/playing-history/:betNo/changes',guard(),wrap(async(req,res)=>{
    if(!/^\d{1,18}$/.test(req.params.betNo))throw fail(400,'Invalid bet number.');
    const rows=(await pool.query('SELECT id,old_value,new_value,created_at FROM tsb_history_changes WHERE bet_no=$1 ORDER BY id DESC LIMIT 100',[req.params.betNo])).rows;
    const settlements=(await pool.query(`SELECT m.actor,m.outcome,m.reason,m.evidence,m.payout,m.created_at FROM tsb_sports_manual_settlements m
      JOIN tsb_playing_history h ON h.source='demo_bets' AND h.source_key=m.bet_id::TEXT WHERE h.bet_no=$1`,[req.params.betNo])).rows;
    res.json({changes:rows,manualSettlements:settlements});
  }));
  app.post('/api/playing-history/:betNo/settle',guard('settle'),wrap(async(req,res)=>{
    const body=req.body||{},number=String(req.params.betNo),reason=String(body.reason||'').trim(),evidence=String(body.evidence||'').trim();
    if(!/^\d{1,18}$/.test(number)||!['WON','LOST','VOID'].includes(body.outcome)||!Number.isInteger(body.version)||body.confirmed!==true||
      !/^[a-zA-Z0-9_-]{16,100}$/.test(String(body.requestKey||''))||reason.length<5||reason.length>1000||evidence.length<5||evidence.length>2000)throw fail(400,'Choose a result, add a reason and verified result reference, then confirm settlement.');
    const result=await transaction(pool,async client=>{
      const actor=await readActor(client,req,true);
      if(actor.mustChangePassword||!actor.canView||!actor.canSettle)throw fail(403,'Sports settlement permission changed.');
      const history=(await client.query("SELECT * FROM tsb_playing_history WHERE bet_no=$1 AND source='demo_bets' AND game='SPORTS_API'",[number])).rows[0];
      if(!history)throw fail(404,'Sports bet not found.');
      const wallet=(await client.query('SELECT demo_coin_balance,status FROM customers WHERE id=$1 FOR UPDATE',[history.customer_id])).rows[0];
      if(!wallet||wallet.status!=='ACTIVE')throw fail(409,'Customer is inactive. Resolve the account status before settlement.');
      const bet=(await client.query('SELECT * FROM demo_bets WHERE id=$1 AND customer_id=$2 FOR UPDATE',[history.source_key,history.customer_id])).rows[0];
      const prior=(await client.query('SELECT * FROM tsb_sports_manual_settlements WHERE bet_id=$1',[history.source_key])).rows[0];
      if(prior){
        if(prior.actor!==actor.key||prior.request_key!==body.requestKey||prior.outcome!==body.outcome||prior.reason!==reason||prior.evidence!==evidence)throw fail(409,'This bet is already manually settled. Refresh history.');
        return {success:true,replayed:true,balance:Number(wallet.demo_coin_balance)};
      }
      const current=(await client.query('SELECT * FROM tsb_playing_history WHERE bet_no=$1 FOR UPDATE',[number])).rows[0];
      if(!bet||!['MATCHED','UNMATCHED'].includes(bet.status)||current.result!=null)throw fail(409,'This bet is already settled or is not eligible. No coins changed.');
      if(current.version!==body.version)throw fail(409,'Bet details changed. Refresh and review again.');
      const returned=body.outcome==='VOID'?Number(bet.stake):body.outcome==='WON'?Math.round(Number(bet.stake)*Number(bet.payout_rate)):0;
      const balance=Number(wallet.demo_coin_balance)+returned;
      if(!Number.isSafeInteger(returned)||returned<0||!Number.isSafeInteger(balance)||balance>2147483647)throw fail(409,'Demo wallet limit exceeded.');
      await client.query(`UPDATE demo_bets SET status='SETTLED',result=$1,payout=$2,profit_loss=$2-stake,balance_after=$3,settled_at=clock_timestamp() WHERE id=$4`,[body.outcome,returned,balance,bet.id]);
      await client.query('UPDATE customers SET demo_coin_balance=$1,updated_at=NOW() WHERE id=$2',[balance,history.customer_id]);
      if(returned>0)await client.query("INSERT INTO demo_coin_transactions(customer_id,amount,transaction_type,note) VALUES($1,$2,$3,$4)",[history.customer_id,returned,body.outcome==='VOID'?'BET_REFUND':'BET_PAYOUT',`Manual sports settlement #${number}; ${body.outcome}; stake included; ${actor.key}`]);
      await client.query('INSERT INTO tsb_sports_manual_settlements(bet_id,actor,request_key,outcome,reason,evidence,payout) VALUES($1,$2,$3,$4,$5,$6,$7)',[bet.id,actor.key,body.requestKey,body.outcome,reason,evidence,returned]);
      return {success:true,replayed:false,balance};
    });res.json(result);
  }));
  app.get('/api/playing-history/stream',guard(),wrap(async(req,res)=>{
    res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform',Connection:'keep-alive','X-Accel-Buffering':'no'});
    res.flushHeaders();clients.add(res);res.write('data: {"type":"refresh"}\n\n');void startBroker();
    let checking=false;
    const timer=setInterval(async()=>{
      if(checking)return;checking=true;
      try{const actor=await readActor(pool,req);if(!actor.canView||actor.mustChangePassword)throw Error();res.write(': keep-alive\n\n');}
      catch{clients.delete(res);res.end();clearInterval(timer);}finally{checking=false;}
    },15000);timer.unref?.();req.on('close',()=>{clearInterval(timer);clients.delete(res);});
  }));
}
