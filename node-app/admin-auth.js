import {isAbsolute, relative, resolve, sep} from 'node:path';
import {createRemoteJWKSet, errors, jwtVerify} from 'jose';

export class AdminError extends Error {
  constructor(status, message) { super(message); this.status=status; }
}

export function outsidePublicDirectory(directory,publicDir) {
  const path=relative(resolve(publicDir),resolve(directory));
  return path==='..'||path.startsWith(`..${sep}`)||isAbsolute(path);
}

export function readAdminConfig(env, publicDir) {
  if(env.MJ_ADMIN_ENABLED!=='true')return null;
  const issuer=env.MJ_ADMIN_ACCESS_ISSUER?.replace(/\/$/,'');
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer??''))throw Error('Configure a valid Cloudflare Access team issuer.');
  const audience=env.MJ_ADMIN_ACCESS_AUD;
  if(!/^[a-f0-9]{64}$/.test(audience??''))throw Error('Configure the Cloudflare Access application audience.');
  const origin=new URL(env.MJ_ADMIN_ORIGIN);
  if(origin.protocol!=='https:'||origin.origin!==env.MJ_ADMIN_ORIGIN)throw Error('Configure an HTTPS admin origin without a trailing slash.');
  const emails=(env.MJ_ADMIN_EMAILS??'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  if(!emails.length||emails.length>20||emails.some(value=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))throw Error('Configure an explicit administrator email allowlist.');
  const dataDir=env.MJ_ADMIN_DATA_DIR;
  if(!dataDir||!isAbsolute(dataDir))throw Error('Configure an absolute persistent admin data directory.');
  if(!outsidePublicDirectory(dataDir,publicDir))throw Error('Admin data must be outside the public directory.');
  return {issuer,audience,origin:origin.origin,emails:new Set(emails),dataDir:resolve(dataDir)};
}

export function createAccessVerifier(config, keySet=createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`),{
  timeoutDuration:5000,cooldownDuration:30000,cacheMaxAge:300000
})) {
  return async request=>{
    const token=request.headers['cf-access-jwt-assertion'];
    if(typeof token!=='string'||token.length>16384)throw new AdminError(401,'Administrator sign-in is required.');
    let payload;
    try {
      ({payload}=await jwtVerify(token,keySet,{
        issuer:config.issuer,audience:config.audience,algorithms:['RS256'],
        requiredClaims:['sub','email','type','iat','exp'],maxTokenAge:'1h',clockTolerance:5
      }));
    }catch(error){
      if(!(error instanceof errors.JOSEError)||error.code==='ERR_JWKS_TIMEOUT'||error.code==='ERR_JOSE_GENERIC'){
        console.error('Cloudflare Access verification service unavailable.',error.code??error.name);
        throw new AdminError(503,'Administrator sign-in could not be verified. Try again.');
      }
      throw new AdminError(401,'Administrator sign-in is required.');
    }
    if(payload.type!=='app'||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>256||
      typeof payload.email!=='string'||!config.emails.has(payload.email.toLowerCase()))throw new AdminError(403,'Administrator access is not allowed.');
    return {subject:payload.sub,email:payload.email};
  };
}

export function requireAdminMutation(request,config) {
  if(request.headers.origin!==config.origin||request.headers['x-mj-admin']!=='1'||
    request.headers['sec-fetch-site']==='cross-site')throw new AdminError(403,'Same-origin administrator action required.');
}
