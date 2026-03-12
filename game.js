// NEON WORLD '99 — FINAL ENGINE

const GAME_SECONDS = 60

// progression order
const CITY_ORDER = [
"New York",
"Tokyo",
"Berlin",
"Rio",
"Seoul",
"London",
"Paris",
"Dubai",
"Singapore",
"Istanbul"
]

// unlock requirements
const CITY_REQUIRE = {
"New York":0,
"Tokyo":500,
"Berlin":700,
"Rio":900,
"Seoul":1100,
"London":1300,
"Paris":1500,
"Dubai":1800,
"Singapore":2100,
"Istanbul":2500
}

// difficulty
const CITY_DIFF = {

"New York":{bpm:110,note:180,spawn:1},
"Tokyo":{bpm:118,note:195,spawn:1.05},
"Berlin":{bpm:122,note:210,spawn:1.1},
"Rio":{bpm:126,note:225,spawn:1.15},
"Seoul":{bpm:130,note:240,spawn:1.2},
"London":{bpm:134,note:255,spawn:1.25},
"Paris":{bpm:138,note:270,spawn:1.3},
"Dubai":{bpm:142,note:285,spawn:1.35},
"Singapore":{bpm:146,note:300,spawn:1.4},
"Istanbul":{bpm:150,note:320,spawn:1.5}

}

// storage
function loadBest(){
try{
const v=localStorage.getItem("neon99_best")
return v?parseInt(v,10):0
}catch{return 0}
}

function saveBest(v){
localStorage.setItem("neon99_best",String(v))
}

function loadCityScores(){
try{
const j=localStorage.getItem("neon99_city_scores")
return j?JSON.parse(j):{}
}catch{return{}}
}

function saveCityScore(city,score){

const data=loadCityScores()

if(!data[city]||score>data[city]){
data[city]=score
}

localStorage.setItem(
"neon99_city_scores",
JSON.stringify(data)
)

}

function getCityScore(city){
const data=loadCityScores()
return data[city]||0
}

// unlock
function cityUnlocked(city){

if(city==="New York") return true

const index=CITY_ORDER.indexOf(city)
const prev=CITY_ORDER[index-1]

const prevScore=getCityScore(prev)

return prevScore>=CITY_REQUIRE[city]

}

// mode
function getMode(){
return localStorage.getItem("neon99_mode")||"free"
}

function getWallet(){
return localStorage.getItem("neon99_wallet")||"guest"
}

function getCountry(){
return localStorage.getItem("neon99_country")||"TR"
}

// navigation
window.goFree=function(){
localStorage.setItem("neon99_mode","free")
location.href="/city.html"
}

window.goRanked=function(){
localStorage.setItem("neon99_mode","ranked")
location.href="/city.html"
}

window.goBoard=function(){
location.href="/board.html"
}

// city select
window.city=function(name){

if(!cityUnlocked(name)){
alert("CITY LOCKED\nPlay previous city first")
return
}

currentCity=name
startGame()

}

// globals
let currentCity="New York"
let bestScore=loadBest()

// game start
function startGame(){

document.body.innerHTML=`

<div style="text-align:center;color:white;font-family:monospace;padding:16px">

<h1 style="color:#00d4ff">NEON WORLD '99</h1>

<div>City: <b>${currentCity}</b></div>

<div style="margin:10px">

TIME <b id="t">60</b>

&nbsp;

SCORE <b id="s">0</b>

&nbsp;

COMBO <b id="c">0</b>

&nbsp;

BEST <b id="b">${bestScore}</b>

</div>

<canvas id="cv"
width="390"
height="600"
style="width:100%;max-width:420px;border:1px solid #444">
</canvas>

</div>

`

runGame()

}

// main game
function runGame(){

const cv=document.getElementById("cv")
const ctx=cv.getContext("2d")

const diff=CITY_DIFF[currentCity]

let time=GAME_SECONDS
let score=0
let combo=0

const notes=[]

let spawnTimer=0

function spawn(){

notes.push({

y:-20,

speed:diff.note

})

}

// input
cv.onclick=hit

function hit(){

const hitY=cv.height*0.78

const i=notes.findIndex(
n=>Math.abs(n.y-hitY)<20
)

if(i>=0){

notes.splice(i,1)

combo++

score+=200+(combo*10)

}else{

combo=0

score=Math.max(0,score-60)

}

}

// loop
let last=performance.now()

function loop(now){

const dt=(now-last)/1000

last=now

time-=dt

spawnTimer+=dt*diff.spawn

if(spawnTimer>0.6){

spawnTimer=0

spawn()

}

notes.forEach(n=>{
n.y+=n.speed*dt
})

ctx.clearRect(0,0,cv.width,cv.height)

const hitY=cv.height*0.78

ctx.strokeStyle="#0ff"

ctx.beginPath()

ctx.moveTo(0,hitY)

ctx.lineTo(cv.width,hitY)

ctx.stroke()

notes.forEach(n=>{

ctx.fillStyle="#ff2d6b"

ctx.fillRect(
cv.width/2-35,
n.y,
70,
14
)

})

document.getElementById("t").textContent=Math.ceil(time)
document.getElementById("s").textContent=score
document.getElementById("c").textContent=combo

if(time<=0){

end(score)

return

}

requestAnimationFrame(loop)

}

requestAnimationFrame(loop)

}

// game end
function end(finalScore){

bestScore=Math.max(bestScore,finalScore)

saveBest(bestScore)

// city score
saveCityScore(currentCity,finalScore)

// backend submit
try{

fetch("/api/submit-score",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

wallet:getWallet(),

score:finalScore,

city:currentCity,

country:getCountry(),

mode:getMode()

})

})

}catch{}

// next unlock info
const index=CITY_ORDER.indexOf(currentCity)

const next=CITY_ORDER[index+1]

let msg="SCORE: "+finalScore+

"\nCITY BEST: "+getCityScore(currentCity)

if(next){

msg+="\n\nNEXT CITY: "+next+
"\nNEED: "+CITY_REQUIRE[next]

}

alert(msg)

location.href="/city.html"

}
