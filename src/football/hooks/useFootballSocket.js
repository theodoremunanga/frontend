import {
  useEffect,
  useState
} from "react";


import {
  connectSocket,
  getSocket
} from "../../services/socket";



export default function useFootballSocket(
  matchId,
  userId
){

  const [match,setMatch] =
    useState(null);


  const [events,setEvents] =
    useState([]);


  const [finished,setFinished] =
    useState(null);


  const [error,setError] =
    useState(null);



  useEffect(()=>{


    if(!matchId)
      return;



    const token =
      localStorage.getItem("token");


    const socket =
      getSocket() ||
      connectSocket(token);



    if(!socket)
      return;



    console.log(
      "⚽ Football socket ready"
    );



    /*
      JOIN MATCH
    */
    socket.emit(
      "football:join",
      {
        matchId,
        userId
      }
    );



    /*
      ETAT INITIAL
    */
    socket.on(
      "football:state",
      (data)=>{

        console.log(
          "⚽ STATE",
          data
        );


        setMatch(data);

      }
    );



    /*
      UPDATE MINUTE
    */
    socket.on(
      "football:update",
      (data)=>{


        setMatch(prev=>({

          ...prev,

          minute:
            data.minute,

          phase:
            data.phase,

          homeScore:
            data.homeScore,

          awayScore:
            data.awayScore

        }));


        if(data.events?.length){

          setEvents(prev=>[
            ...data.events,
            ...prev
          ]);

        }


      }
    );



    /*
      BUT
    */
    socket.on(
      "football:goal",
      (goal)=>{


        setEvents(prev=>[
          {
            ...goal,
            type:"GOAL"
          },
          ...prev
        ]);


      }
    );



    /*
      CARTON
    */
    socket.on(
      "football:card",
      (card)=>{


        setEvents(prev=>[
          {
            ...card,
            type:"CARD"
          },
          ...prev
        ]);


      }
    );



    /*
      FIN MATCH
    */
    socket.on(
      "football:end",
      (data)=>{

        setFinished(data);

      }
    );



    /*
      ERREURS
    */
    socket.on(
      "football:error",
      (err)=>{

        console.error(
          "Football error",
          err
        );

        setError(
          err.message
        );

      }
    );



    return()=>{


      socket.off(
        "football:state"
      );


      socket.off(
        "football:update"
      );


      socket.off(
        "football:goal"
      );


      socket.off(
        "football:card"
      );


      socket.off(
        "football:end"
      );


      socket.off(
        "football:error"
      );


    };


  },[
    matchId,
    userId
  ]);



  return {
    match,
    events,
    finished,
    error
  };

}