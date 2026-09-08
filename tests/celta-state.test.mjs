import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const source = async name => readFile(new URL(`../src/lib/celta/${name}.js`,import.meta.url),'utf8')
const url = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
const expeditionUrl = url(await source('expeditions'))
const {chapters,initialProgress,normalizeProgress,recordStep} = await import(url((await source('story')).replace("'./expeditions'",JSON.stringify(expeditionUrl))))
const {findWalkingPath} = await import(url(await source('navigation')))
const {groundHeight,traversable} = await import(url(await source('worlds')))
const {assessPhotograph} = await import(url(await source('photography')))
const image = 'data:image/jpeg;base64,/9j/2Q=='
const fresh = () => structuredClone(initialProgress)

function completeMission(progress) {
  const mission=chapters[progress.chapter].missions[progress.mission]
  for(const step of mission.steps) {
    progress=recordStep(progress,{id:step.id,complete:true,choice:1,...(step.type==='photo'?{photo:{image}}:{})})
    progress=normalizeProgress(JSON.parse(JSON.stringify(progress)))
  }
  return progress
}

test('all investigations and required photographs survive saving at every stage',()=>{
  let progress=fresh()
  for(let chapter=0;chapter<3;chapter++) {
    for(let mission=0;mission<3;mission++) {
      progress=completeMission(progress)
      assert.equal(progress.entries.length,chapter*3+mission+1)
      assert.equal(progress.mission,mission+1)
      assert.equal(progress.step,0)
    }
    if(chapter<2)progress={...progress,chapter:chapter+1,mission:0,step:0}
  }
  assert.equal(normalizeProgress({...progress,completed:false}).completed,true)
  assert.equal(progress.photos.length,3)
  assert.deepEqual(progress.entries.map(e=>e.id),chapters.flatMap(c=>c.missions.map(m=>m.id)))
})

test('photographic objective cannot be completed without an actual photo payload',()=>{
  let progress=fresh()
  const steps=chapters[0].missions[0].steps
  progress=recordStep(progress,{id:steps[0].id,complete:true})
  assert.equal(progress.step,1)
  assert.equal(recordStep(progress,{id:steps[1].id,complete:true}),progress)
  assert.equal(recordStep(progress,{id:steps[1].id,complete:true,photo:{image:'javascript:alert(1)'}}),progress)
  assert.equal(recordStep(progress,{id:steps[1].id,complete:true,photo:{image}}).mission,1)
})

test('closing, incomplete or out-of-order activity results do not advance the story',()=>{
  const p=fresh()
  for(const result of [{},{id:'congo-consent'},{id:'congo-portrait',complete:true,photo:{image}},{id:'congo-case',complete:true}])assert.equal(recordStep(p,result),p)
})

test('corrupt progress and impossible partial steps recover to a playable state',()=>{
  for(const value of [null,{}, {...initialProgress,version:1},{...initialProgress,chapter:3},{...initialProgress,mission:7},{...initialProgress,step:9},{...initialProgress,entries:'bad'},{...initialProgress,chapter:.5}])assert.deepEqual(normalizeProgress(value),initialProgress)
})

test('forged completion and out-of-order notebook entries cannot skip the campaign',()=>{
  assert.equal(normalizeProgress({...fresh(),completed:true}).completed,false)
  const first=completeMission(fresh())
  assert.deepEqual(normalizeProgress({...first,entries:[]}),initialProgress)
  assert.deepEqual(normalizeProgress({...first,entries:[{...first.entries[0],id:'amazon-witness'}]}),initialProgress)
})

test('invalid album payloads are discarded while authentic photos and free photos survive',()=>{
  const valid={id:'congo-portrait',image},free={id:'free-1788900000000',image}
  const result=normalizeProgress({...fresh(),photos:[valid,valid,free,{id:'x',image},{id:'congo-depot',image:'data:text/html;base64,QQ=='}]})
  assert.equal(result.photos.length,2)
})

test('photographs require visible subject, proper distance, framing and focus',()=>{
  const input={distance:5,frameX:.1,frameY:.1,depth:.6,focus:5,occluded:false,coverage:.3}
  assert.equal(assessPhotograph(input).ready,true)
  for(const change of [{distance:1},{frameX:1},{depth:1.1},{focus:13},{occluded:true},{coverage:.01},{coverage:1.2}])assert.equal(assessPhotograph({...input,...change}).ready,false)
})

test('all Blender mission and intermediate locations are reachable with player clearance',async()=>{
  const worlds=JSON.parse(await readFile(new URL('../public/celta/models/worlds.json',import.meta.url),'utf8'))
  for(const [index,id] of ['congo','amazonia','ireland'].entries()) {
    const world=worlds[id]
    const walk=(x,z)=>traversable(world,x,z)
    assert.ok(walk(...world.spawn),`${id} spawn`)
    for(const mission of chapters[index].missions)for(const step of mission.steps) {
      if(step.id==='last-memory')continue
      assert.ok(walk(...step.position),`${id}/${step.id} target`)
      const path=findWalkingPath(world.spawn,step.position,walk,false,world.bounds)
      assert.ok(path.length,`${id}/${step.id} reachable`)
      assert.ok(Math.hypot(path.at(-1)[0]-step.position[0],path.at(-1)[1]-step.position[1])<1,`${step.id} arrival`)
      assert.ok(Number.isFinite(groundHeight(world,...step.position)))
    }
  }
})

test('guidance does not cross a disconnected river channel',()=>{
  assert.deepEqual(findWalkingPath([-10,-10],[-10,-35],(x,z)=>x<-3&&(z>-20||z<-25)),[])
})

test('the last prison objective remains reachable inside the cell',()=>{
  const path=findWalkingPath([0,1.8],[-1.5,-2],(x,z)=>x>-2.4&&x<2.4&&z>-3&&z<3,true)
  assert.ok(path.length)
  assert.deepEqual(path.at(-1),[-1.5,-2])
})
