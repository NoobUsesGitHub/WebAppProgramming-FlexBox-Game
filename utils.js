

const solutions = require("./public_files/Assets/Solutions.json");
const { stringify } = require("querystring");

const checkSolution = (id, input)=>{
    const solutionForTheLevel= solutions.find( solution=> solution.Level=== Number(id));
    
    console.log(solutionForTheLevel);
    console.table(solutions);

    if(!solutionForTheLevel)
        return false;

    try{
        const solutionsList=JSON.stringify(solutionForTheLevel.solutions);
    }catch(e)
    {
        throw new Error("json Error", { cause : error});
    }

    solutionsList.array.forEach(item => {
        if(item===input)
            return true;
    });

    return false;

};

module.exports={checkSolution};