export default function ScoreBoard({
  match
}) {

  if (!match) {
    return (
      <div className="football-loading">
        Chargement du match...
      </div>
    );
  }


  return (
    <div className="football-scoreboard">

      <div className="team home">

        <h3>
          🏠 Domicile
        </h3>

        <strong>
          {match.home_score ?? match.homeScore ?? 0}
        </strong>

      </div>



      <div className="center">


        <h1>
          ⚽ LIVE
        </h1>


        <div className="score">

          {
            match.home_score ??
            match.homeScore ??
            0
          }

          {" - "}

          {
            match.away_score ??
            match.awayScore ??
            0
          }

        </div>


        <p>
          ⏱
          {" "}
          {match.minute ?? 0}'
        </p>


        <small>
          {match.phase}
        </small>


      </div>



      <div className="team away">

        <h3>
          ✈️ Extérieur
        </h3>


        <strong>
          {match.away_score ?? match.awayScore ?? 0}
        </strong>


      </div>


    </div>
  );
}