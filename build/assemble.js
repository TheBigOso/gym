const fs=require('fs'),p=require('path');const r=(f)=>fs.readFileSync(p.join(__dirname,'../src',f),'utf8');
const safe=(s)=>s.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
const data=`const RR_DATA=${JSON.stringify({rig:JSON.parse(r('rig.json')),exercise:JSON.parse(r('exercise.json')),schema:JSON.parse(r('schema.json'))}).replace(/</g,'\\u003c')};`;
let h=r('template.html');
h=h.replace('/*__ENGINE__*/',()=>safe(r('engine.js'))).replace('/*__DATA__*/',()=>data).replace('/*__APP__*/',()=>safe(r('app.js')));
fs.writeFileSync(p.join(__dirname,'../dist/index.html'),h);console.log('bytes',h.length);
