import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {contentDirectory,validatePublishedWeek} from '../published-content.js';
const source=process.argv[2];if(!source)throw Error('Usage: node node-app/scripts/publish-week.mjs path/to/reviewed-week.json [--check]');
const data=JSON.parse(readFileSync(resolve(source),'utf8').replace(/^\uFEFF/,'')),meeting=validatePublishedWeek(data);
if(process.argv.includes('--check')){console.log(`Valid: ${meeting.kind}, week of ${meeting.weekOf}`);}else{mkdirSync(contentDirectory,{recursive:true});const target=join(contentDirectory,`${meeting.kind}-${meeting.weekOf}.json`);writeFileSync(target+'.tmp',JSON.stringify(data,null,2));renameSync(target+'.tmp',target);console.log(`Ready to upload: ${target}`);}
