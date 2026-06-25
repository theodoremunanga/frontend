import {
  useEffect,
  useState
} from "react";


import {
  getFootballMatches
}
from "../services/footballApi";



export default function FootballHome({
  setPage,
  setGameConfig
}){


const [
 matches,
 setMatches
]=useState([]);



const [
 loading,
 setLoading
]=useState(true);



useEffect(()=>{


loadMatches();


},[]);



const loadMatches =
async()=>{

try {


const data =
await getFootballMatches();


setMatches(
 data.matches ||
 data ||
 []
);



}
catch(err){

console.error(
 "Football loading error",
 err
);

}
finally{

setLoading(false);

}

};



const joinMatch =
(match)=>{


const config={

game:"football",

matchId:
match.id,

userId:
JSON.parse(
 localStorage.getItem("user")
)?.id

};



setGameConfig(
 config
);



localStorage.setItem(
 "gameConfig",
 JSON.stringify(config)
);



setPage(
 "game"
);


};



if(loading){

return (

<div>

<h2>
⚽ Chargement football...
</h2>

</div>

);

}



return (

<div className="football-home">


<h1>
🏟️ Football Live
</h1>



{
matches.length===0 ?

<p>
Aucun match disponible
</p>


:

matches.map(
(match)=>(


<div
key={match.id}
className="football-card"
>


<h2>

{
match.home_team ||
"Équipe domicile"
}


{" VS "}


{
match.away_team ||
"Équipe extérieure"
}


</h2>


<p>
Statut :
{" "}
{match.status}
</p>



<button

onClick={()=>
joinMatch(match)
}

>

Voir le match

</button>



</div>


)

)

}



</div>

);


}