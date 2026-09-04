const { json } = require("body-parser");

const submitBtn=document.getElementById("submitBtn");


submitBtn.addEventListener("click",()=>{
    const userSolution=document.getElementById("solution").value;
    console.log(userSolution);
    
    fetch("/api/solution",{
        method:"POST",
        headers:{
            "Content-Type" : "application/Json"
        },
        body: JSON.stringify({
            id:1,
            sol: usrSolution
        })
    });



})

submitBtn.removeEventListener("click",()=>{
    const usrSolution=document.getElementById("solution").value;
    
    fetch("/api/solution",{
        method:"POST",
        headers:{
            "Content-Type" : "application/Json"
        },
        body: JSON.stringify({
            id:1,
            sol: usrSolution
        })
    });



})