
const express=require("express");
const path= require("path");
const utils=require("./utils");
const app= express();

const PORT=3000;

app.use(express.json());
app.use(express.static(path.join(__dirname,"..","public_files")));

app.post("/checkSolution",utils.check);
app.get("/getLevel/:id",utils.getLevel);
app.get("/getLevels",utils.getLevels);
app.get("/getHint/:id",utils.getHint);


app.listen(PORT, ()=>{
    console.log(`server running at http://localhost:${PORT}`);
});

