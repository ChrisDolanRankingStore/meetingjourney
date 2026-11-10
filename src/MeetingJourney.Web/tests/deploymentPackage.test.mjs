import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
test('filtered Railpack output starts independently with its admin dependencies and only one public client',async()=>{
  const config=JSON.parse(readFileSync(join(root,'railpack.json'),'utf8'));
  const outputs=config.steps?.build?.deployOutputs;
  assert.ok(outputs?.length,'Railpack must explicitly filter runtime output instead of shipping the build workspace.');
  const directory=mkdtempSync(join(tmpdir(),'mj-runtime-package-'));
  let server;
  try{
    for(const output of outputs)for(const path of output.include){
      assert.ok(path!=='.'&&!path.includes('..'),'Runtime outputs must not copy the whole workspace.');
      cpSync(join(root,path),join(directory,path),{recursive:true,filter:source=>relative(root,source)!==join('node-app','public')});
    }
    for(const path of ['.git','src','.admin-data','publish-node'])assert.equal(existsSync(join(directory,path)),false,path);
    const publicDir=join(directory,'node-app','public');
    mkdirSync(join(publicDir,'assets'),{recursive:true});
    writeFileSync(join(publicDir,'index.html'),'Runtime client fixture');
    const image='journey-river-v1-480.webp';
    cpSync(join(root,'src','MeetingJourney.Web','public','assets','compact-v1',image),join(publicDir,'assets',image));
    server=spawn(process.execPath,['server.js'],{cwd:directory,env:{...process.env,PORT:'0',MJ_ADMIN_ENABLED:'false',MJ_ARTWORK_AUTOMATION_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
    let stderr='';server.stderr.on('data',data=>{stderr+=data;});
    const port=await new Promise((resolvePort,reject)=>{
      const timer=setTimeout(()=>reject(Error('Packaged server startup timed out: '+stderr)),10000);
      let output='';
      server.once('error',error=>{clearTimeout(timer);reject(error);});
      server.once('exit',code=>{clearTimeout(timer);reject(Error(`Packaged server exited (${code}): ${stderr}`));});
      server.stdout.on('data',data=>{
        output+=data;
        let newline;
        while((newline=output.indexOf('\n'))>=0){
          const line=output.slice(0,newline);output=output.slice(newline+1);
          if(!line.trim())continue;
          const event=JSON.parse(line);
          if(event.port){clearTimeout(timer);resolvePort(event.port);}
        }
      });
    });
    const base=`http://127.0.0.1:${port}`;
    assert.equal((await fetch(base+'/health').then(response=>response.json())).status,'ok');
    assert.equal(await fetch(base+'/').then(response=>response.text()),'Runtime client fixture');
    const artwork=await fetch(`${base}/assets/${image}`);
    assert.equal(artwork.status,200);assert.equal(artwork.headers.get('content-type'),'image/webp');
    assert.equal((await fetch(base+'/api/admin/session')).status,503);
  }finally{
    if(server&&server.exitCode===null){const exited=new Promise(resolveExit=>server.once('exit',resolveExit));server.kill();await exited;}
    rmSync(directory,{recursive:true,force:true});
  }
});
