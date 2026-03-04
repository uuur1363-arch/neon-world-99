import supabase from "./_db.js"

export default async function handler(req,res){

if(req.method !== "POST"){
return res.status(405).json({error:"method"})
}

const {wallet,score} = req.body

if(!wallet){
return res.status(400).json({error:"wallet"})
}

await supabase
.from("users")
.upsert({
wallet,
best_score:score,
created_at:Date.now()
})

return res.json({ok:true})

}
