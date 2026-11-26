import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const pg=await b.newPage({viewport:{width:1400,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(String(e)));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await pg.goto('file:///home/claude/gym-anim/dist/index.html');await pg.waitForTimeout(600);
const res=await pg.evaluate(()=>{
  const {R,rig,tl}=__rr, EX=RR_DATA.exercise, V=R.V, Q=R.Q; const out={};
  const tgt=EX.poses.tabletop.ik.arm_l.target; let slide=0,knee=0,pel=0,floor=0,gazeErr=null,peak=-1,peakT=0,elb=[99,0];
  const W0=R.evalPose(rig,tl.pose(0),EX.contacts);
  for(let i=0;i<=800;i++){const t=i/800*8,W=R.evalPose(rig,tl.pose(t),EX.contacts),m=R.measures(W);
    slide=Math.max(slide,V.len(V.sub(W.wrist_l.p,tgt)));
    knee=Math.max(knee,V.len(V.sub(W.knee_r.p,W0.knee_r.p)),V.len(V.sub(W.knee_l.p,W0.knee_l.p)));
    pel=Math.max(pel,V.len(V.sub(W.pelvis.p,W0.pelvis.p)));
    elb=[Math.min(elb[0],m.elbowL),Math.max(elb[1],m.elbowL)];
    if(m.shoulderLineIncl>peak){peak=m.shoulderLineIncl;peakT=t;}
    for(const s of rig.shapes){const g=R.shapeWorld(W,s);const y=g.kind==='capsule'?Math.min(g.a[1]-g.r[0],g.b[1]-g.r[1]):g.c[1]-Math.hypot(g.axes[0][1],g.axes[1][1],g.axes[2][1]);floor=Math.min(floor,y);}
  }
  // right hand planted during setup/reset
  const Wr=R.evalPose(rig,tl.pose(0.3),EX.contacts), rT=[tgt[0],tgt[1],-tgt[2]];
  out.rightPlantedErr=V.len(V.sub(Wr.wrist_r.p,rT)).toFixed(2);
  // gaze at peak: angle between head forward and eye->hand
  const Wp=R.evalPose(rig,tl.pose(4.8),EX.contacts),H=Wp.head_c1,eye=V.add(H.p,Q.rot(H.q,[11,8,0]));
  out.gazeToHandDeg=V.angle(Q.rot(H.q,[1,0,0]),V.sub(Wp.handtip_r.p,eye)).toFixed(1);
  out.reachArmFromVertical=V.angle(V.sub(Wp.wrist_r.p,Wp.shoulder_r.p),[0,1,0]).toFixed(1);
  const ch=tl.pose(4.8).ch; out.peakThoracic=(ch.spine_t12.rot+ch.spine_t6.rot).toFixed(1); out.peakLumbar=ch.spine_l5.rot.toFixed(1);
  Object.assign(out,{supportHandSlideCm:slide.toFixed(3),kneeDriftCm:knee.toFixed(3),pelvisDriftCm:pel.toFixed(3),minBodyHeightCm:floor.toFixed(2),supportElbowRange:elb.map(v=>v.toFixed(1)),peakShoulderLine:peak.toFixed(1),peakAt:peakT.toFixed(2)});
  // joint limits check
  const viol=[];for(const k of EX.keyframes){const ps=EX.poses[k.pose];for(const j in ps.ch){const J=rig.byId[j];if(!J||!J.limits)continue;for(const c in ps.ch[j]){const L=J.limits[c];if(L&&(ps.ch[j][c]<L[0]-0.5||ps.ch[j][c]>L[1]+0.5))viol.push(`${k.pose}.${j}.${c}=${ps.ch[j][c]}`);}}}
  out.limitViolations=[...new Set(viol)];
  return out;});
console.log(JSON.stringify(res,null,1));
// mirror: Left render == horizontal flip of Right render
const shot=async(side)=>{await pg.evaluate(s=>{__rr.S.playing=false;__rr.S.side=s;__rr.S.show.paths=false;__rr.setT(4.4)},side);await pg.waitForTimeout(50);return pg.evaluate(()=>{const c=document.getElementById('cv');const x=c.getContext('2d').getImageData(0,0,c.width,c.height);return Array.from(x.data.filter((_,i)=>i%16===0));});};
const a=await shot('R'), bb=await shot('L');
const w=await pg.evaluate(()=>document.getElementById('cv').width);
console.log('mirror pixel sample lengths',a.length,bb.length,'(visual check via screenshots)');
// speed: advance at 1.5x for 1s
await pg.evaluate(()=>{const S=__rr.S;S.show.paths=true;S.side='R';S.t=0;S.speed=1.5;S.playing=true;});await pg.waitForTimeout(1000);
const t1=await pg.evaluate(()=>{__rr.S.playing=false;return __rr.S.t});console.log('t after ~1s at 1.5x',t1.toFixed(2));
// UI controls
for(const id of ['#play','#scrub','#speed button','#sideSeg button','#camSeg button','#toggles .chip','#bgSeg button','#exPng','#exSvg','#copyJson','#dlJson']) console.log(id, await pg.locator(id).count());
const svg=await pg.evaluate(()=>__rr.frameSVG());fs.writeFileSync('shots/frame.svg',svg);console.log('svg bytes',svg.length);
console.log('errors',JSON.stringify(errs));await b.close();
