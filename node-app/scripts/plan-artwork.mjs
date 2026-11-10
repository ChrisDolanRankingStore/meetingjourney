import {fileURLToPath} from 'node:url';
import {createAdminHandler} from '../admin.js';

const handler=createAdminHandler({publicDir:fileURLToPath(new URL('../public/',import.meta.url))});
try{
  const result=await handler.runPlanner();
  console.log(JSON.stringify(result,null,2));
  if(result.issues?.length)process.exitCode=1;
}catch(error){
  console.error('Artwork planning did not complete: '+error.message);process.exitCode=1;
}finally{await handler.close();}
