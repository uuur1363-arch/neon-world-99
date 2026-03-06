export const runtime = "nodejs";
import { supa } from "./_db.js";

function getWeekKey() {

const d = new Date();
const y = d.getUTCFullYear();

const start = new Date(Date.UTC(y,0,1));
const diff = Math.floor((d-start)/86400000);

const week = Math.floor(diff/7)+1;

return y+"-W"+String(week).padStart(2,"0");

}

export default async function handler(req,res){

try{

const db = supa();
const week_key = getWeekKey();

if(req.method==="GET"){

const {data} = await db
.from("jackpot_weeks")
.select("*")
.eq("week_key",week_key)
.maybeSingle();

return res.status(200).json({

ok:true,
week_key,
pool_sol:Number(data?.pool_sol||0),
entries:Number(data?.entries||0)

});

}

if(req.method==="POST"){

const {add_sol}=req.body||{};
const inc=Number(add_sol||0);

const {data:existing}=await db
.from("jackpot_weeks")
.select("*")
.eq("week_key",week_key)
.maybeSingle();

const nextPool=Number(existing?.pool_sol||0)+inc;
const nextEntries=Number(existing?.entries||0)+1;

await db.from("jackpot_weeks").upsert({

week_key,
pool_sol:nextPool,
entries:nextEntries

});

return res.status(200).json({

ok:true,
week_key,
pool_sol:nextPool,
entries:nextEntries

});

}

return res.status(405).json({ok:false});

}catch(e){

return res.status(500).json({ok:false,error:String(e)});

}

}
