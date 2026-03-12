// NEON WORLD '99 — CITY PROGRESSION VERSION

const GAME_SECONDS = 60;

// progression
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
];

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
};

// storage
function loadBest(){
try{
const v=localStorage.getItem("neon99_best")
return v?parseInt(v,10):0
}catch{
return 0
}
}

function saveBest(v){
localStorage.setItem("neon99_best",String(v))
}

// city scores
function loadCityScores(){
try{
const j=localStorage.getItem("neon99_city_scores")
return j?JSON.parse(j):{}
}catch{
return{}
}
}

function saveCityScore(city,score){
const data=loadCityScores()

if(!data[city]||score>data[city]){
data[city]=score
}

localStorage.setItem("neon99_city_scores",JSON.stringify(data))
}

function getCityScore(city){
const data=loadCityScores()
return data[city]||0
}

// unlock check
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

// start city
window.city=async function(name){

if(!cityUnlocked(name)){
alert("CITY LOCKED\nPlay previous city first")
return
}

currentCity=name
startGame()
}

// global
let currentCity="New York"
let bestScore=loadBest()

// game
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
BEST <b id="b">${bestScore}</b>
</div>

<canvas id="cv" width="390" height="600"
style="width:100%;max-width:420px;border:1px solid #444"></canvas>

</div>
`

runGame()
}

function runGame(){

const cv=document.getElementById("cv")
const ctx=cv.getContext("2d")

let time=GAME_SECONDS
let score=0

const notes=[]

function spawn(){
notes.push({
y:-20,
speed:180+Math.random()*60
})
}

cv.onclick=hit

function hit(){

const hitY=cv.height*0.78

const i=notes.findIndex(n=>Math.abs(n.y-hitY)<20)

if(i>=0){

notes.splice(i,1)
score+=200

}else{

score=Math.max(0,score-50)

}
}

let spawnTimer=0

let last=performance.now()

function loop(now){

const dt=(now-last)/1000
last=now

time-=dt
spawnTimer+=dt

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
ctx.fillRect(cv.width/2-35,n.y,70,14)
})

document.getElementById("t").textContent=Math.ceil(time)
document.getElementById("s").textContent=score

if(time<=0){
end(score)
return
}

requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
}

function end(finalScore){

bestScore=Math.max(bestScore,finalScore)
saveBest(bestScore)

// save city score
saveCityScore(currentCity,finalScore)

// submit score
try{

fetch("/api/submit-score",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
wallet:getWallet(),
score:finalScore,
city:currentCity,
country:getCountry(),
mode:getMode()
})
})

}catch{}

alert(
"SCORE: "+finalScore+
"\nCITY BEST: "+getCityScore(currentCity)
)

location.href="/city.html"
}
