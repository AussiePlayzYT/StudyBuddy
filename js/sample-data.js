/* Sample data loader (Settings > Load sample data) */
function seed(){
  const d=n=>addDays(TODAY(),n),tp=(name,conf,diff,quiz,last)=>({id:uid(),name,conf,diff,quiz,last});
  const m={id:"math",name:"Mathematics",teacher:"Ms Chen",color:"#0f766e",desc:"Year 12 Advanced",target:"90%",exam:d(6),topics:[tp("Algebra",2,"Hard",48,d(-16)),tp("Functions",3,"Medium",65,d(-4)),tp("Trigonometry",3,"Medium","",d(-9)),tp("Statistics",4,"Easy",82,d(-3))]};
  const e={id:"eng",name:"English",teacher:"Mr Okafor",color:"#c2410c",desc:"Essay writing",target:"A",exam:"",topics:[tp("Essay structure",3,"Medium","",d(-5)),tp("Poetry analysis",2,"Hard",55,"")]};
  const b={id:"bio",name:"Biology",teacher:"Dr Patel",color:"#4d7c0f",desc:"Cells and genetics",target:"85%",exam:d(20),topics:[tp("Cells",5,"Easy",91,d(-2)),tp("Genetics",3,"Hard",70,d(-10))]};
  S=blank();S.subjects=[m,e,b];
  S.tasks=[{id:uid(),title:"Algebra worksheet",sid:"math",tid:m.topics[0].id,due:d(1),pri:"High",est:45,done:false},{id:uid(),title:"English essay draft",sid:"eng",tid:"",due:d(2),pri:"Medium",est:60,done:false},{id:uid(),title:"Biology revision",sid:"bio",tid:b.topics[0].id,due:TODAY(),pri:"Low",est:20,done:true}];
  S.sessions=[{id:uid(),sid:"math",tid:m.topics[1].id,date:TODAY(),time:"16:00",dur:45,min:45,done:true,rating:4},{id:uid(),sid:"bio",tid:b.topics[1].id,date:d(1),time:"17:00",dur:30,done:false},{id:uid(),sid:"math",tid:m.topics[0].id,date:d(2),time:"16:00",dur:45,done:false}];
  S.goals=[{id:uid(),type:"confidence",sid:"math",tid:m.topics[0].id,target:4,label:"Reach 4/5 in Mathematics – Algebra"},{id:uid(),type:"sessions",sid:"math",tid:"",target:5,label:"Complete 5 Mathematics sessions this week"}];
  save();render();
}
