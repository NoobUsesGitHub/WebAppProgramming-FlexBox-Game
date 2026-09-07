const levels=require("./levels.json");

const onInit=(levelsData)=>{
    const map=new Map();
    for(const level of levelsData){
        const {id, title, instruction, itemCount, controls, kennelParameters, solution, hint}=level;
        map.set(id, [{title, instruction, itemCount, controls, kennelParameters}, solution, hint]);
    }
    return map;
};

const levelsMap=onInit(levels);

const check= async (req,res)=>{
   const requestBody=req.body;

    const currentLevel= levelsMap.get(Number(requestBody.current)+1);
    const levelSolution= currentLevel[1];
    const values=requestBody.values;

    let correct = true;
    for (const prop in levelSolution) {
      if(Array.isArray(levelSolution[prop])){//check if there are multiple options to this solution
        if(!levelSolution[prop].includes(values[prop]))
        {correct=false;
        break;}
      }
      else if (values[prop] !== levelSolution[prop])
         { correct = false;
           break;
          }
    }

    res.status(200).json(correct);
};

const getLevel=(req,res)=>{
    const levelId=req.params.id;

    const levelData=levelsMap.get(Number(levelId)+1);
    if(levelData){
        res.status(200).json(levelData[0]);
    }else
        res.status(500).json("Error:Level not found");

}

const getLevels=(req,res)=>{
    const summary=[];
    for(const [id,data] of levelsMap){
        summary.push({id, title: data[0].title});
    }
    res.status(200).json(summary);
}

const getHint=(req,res)=>{
    const levelId=req.params.id;

    const levelData=levelsMap.get(Number(levelId)+1);
    if(levelData){
        res.status(200).json(levelData[2]);
    }else
        res.status(500).json("Error:Level not found");

}

module.exports={check,onInit,getLevel,getHint,getLevels};