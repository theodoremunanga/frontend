export default function FootballTimer({
 minute,
 phase
}){


return (

<div className="football-timer">

<h2>
⏱ {minute || 0}'
</h2>


<p>
{phase}
</p>


</div>

);


}