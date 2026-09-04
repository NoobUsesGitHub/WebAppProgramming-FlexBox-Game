const {checkSolution}=require("./utils");

const express=require("express");
const path= require("path");

const app= express();

const PORT=3000;

app.use(express.json());
app.use(express.static(path.join(__dirname,"public_files")));

app.post("/api/solution",(req,res)=>{

    console.log("got ${req.body}");

    const {id,sol}=req.body;
    try{
    if(checkSolution(id,sol)){
        res.status(200);
        res.send({success:true});
        }
    else{
        res.status(200);
        res.send({success:false});
        }
    }catch(e){
        console.log(e.cause);
        res.status(500);
        res.send({success:false});
    }
});


app.listen(PORT, ()=>{
    console.log(`server running at http://localhost:${PORT}`);
});

