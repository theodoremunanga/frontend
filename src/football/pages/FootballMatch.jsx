import useFootballSocket
from "../hooks/useFootballSocket";


import ScoreBoard
from "../components/ScoreBoard";


import MatchEvents
from "../components/MatchEvents";


import FootballTimer
from "../components/FootballTimer";



export default function FootballMatch({
 gameConfig
}){


const {

match,

events,

finished,

error

} =
useFootballSocket(
 gameConfig.matchId,
 gameConfig.userId
);



if(error){

return (

<div>

<h2>
❌ Erreur football
</h2>

<p>
{error}
</p>

</div>

);

}



return (

<div className="football-page">


<h1>
🏟️ Match Football
</h1>



<ScoreBoard
match={match}
/>



<FootballTimer

minute={
match?.minute
}

phase={
match?.phase
}

/>



<MatchEvents
events={events}
/>




{
finished && (

<div>

<h2>
🏆 Match terminé
</h2>


<p>
Score final :

{" "}

{finished.homeScore}

-

{finished.awayScore}

</p>


</div>

)

}



</div>

);


}