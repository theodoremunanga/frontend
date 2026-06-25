export default function MatchEvents({
  events = []
}) {


return (

<div className="football-events">


<h2>
📋 Événements
</h2>


{
events.length === 0 ? (

<p>
Aucun événement
</p>

) : (


events.map(
(event,index)=>(


<div
key={index}
className="football-event"
>


{
event.type === "GOAL"
?
"⚽"
:
event.type === "CARD"
?
"🟨"
:
"ℹ️"
}


{" "}


<strong>
{event.type}
</strong>


{" - "}


{event.team || ""}


{" "}


{event.minute &&
`${event.minute}'`
}


</div>


)

)


)


}


</div>

);


}