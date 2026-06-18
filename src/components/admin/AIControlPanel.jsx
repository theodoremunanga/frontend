import { useEffect, useState } from "react";


export default function AIControlPanel({
  ai,
  saveSettings,
  creditBot,
  debitBot,
  transferToSystem,
  refreshAI,
  money,
  actionLoading = false,
}) {


  const [difficulty, setDifficulty] =
    useState(50);

  const [spawnRate, setSpawnRate] =
    useState(50);

  const [maxBots, setMaxBots] =
    useState(100);

  const [enabled, setEnabled] =
    useState(true);


  const [creditAmount, setCreditAmount] =
    useState("");

  const [debitAmount, setDebitAmount] =
    useState("");

  const [transferAmount, setTransferAmount] =
    useState("");



 const wallet =
  ai?.wallet ?? {
    balance_available:0,
    balance_locked:0
 };



  useEffect(() => {


    if (!ai?.settings)
      return;


    setEnabled(
      Boolean(
        ai.settings.enabled
      )
    );


    setDifficulty(
      ai.settings.experience_percent ?? 50
    );


    setSpawnRate(
      ai.settings.spawn_rate ?? 50
    );


    setMaxBots(
      ai.settings.max_active_bots ?? 100
    );


  }, [ai]);





  // =====================================
  // SAVE SETTINGS
  // =====================================

  const handleSaveSettings =
    async () => {

      try {


        await saveSettings({

          enabled,

          experience_percent:
            difficulty,

          spawn_rate:
            spawnRate,

          max_active_bots:
            maxBots,

        });


        await refreshAI();


        alert(
          "✅ Configuration IA sauvegardée"
        );


      } catch(error) {


        console.error(
          error
        );


        alert(
          error?.response?.data?.message ||
          "Erreur sauvegarde IA"
        );

      }

    };





  // =====================================
  // CREDIT BOT
  // =====================================

  const handleCredit =
    async () => {


      const amount =
        Number(
          creditAmount
        );


      if(
        !amount ||
        amount <= 0
      ){

        return alert(
          "Montant invalide"
        );

      }



      try {


        await creditBot(
          amount
        );


        setCreditAmount("");

        await refreshAI();


        alert(
          "✅ Wallet IA crédité"
        );


      }catch(error){


        console.error(error);


        alert(
          error?.response?.data?.message ||
          "Erreur crédit IA"
        );


      }

    };






  // =====================================
  // DEBIT BOT
  // =====================================

  const handleDebit =
    async () => {


      const amount =
        Number(
          debitAmount
        );


      if(
        !amount ||
        amount <=0
      ){

        return alert(
          "Montant invalide"
        );

      }



      if(
        !window.confirm(
          `Débiter ${money(amount)} du wallet IA #9999 ?`
        )
      )
      return;



      try {


        await debitBot(
          amount
        );


        setDebitAmount("");

        await refreshAI();



        alert(
          "✅ Wallet IA débité"
        );



      }catch(error){


        console.error(error);


        alert(
          error?.response?.data?.message ||
          "Erreur débit IA"
        );


      }


    };







  // =====================================
  // TRANSFER SYSTEM
  // =====================================

  const handleTransfer =
    async () => {


      const amount =
        Number(
          transferAmount
        );



      if(
        !amount ||
        amount<=0
      ){

        return alert(
          "Montant invalide"
        );

      }



      if(
        !window.confirm(
          `Transférer ${money(amount)} du wallet IA #9999 vers système #7777 ?`
        )
      )
      return;



      try{


        await transferToSystem(
          amount
        );


        setTransferAmount("");


        await refreshAI();



        alert(
          "✅ Transfert effectué"
        );



      }catch(error){


        console.error(error);


        alert(
          error?.response?.data?.message ||
          "Erreur transfert"
        );


      }


    };







  return (

    <div style={card}>


      <div style={header}>


        <h2 style={{margin:0}}>
          🤖 AI CONTROL CENTER
        </h2>



        <span
          style={{
            ...badge,
            background:
              enabled
              ? "#14532d"
              : "#7f1d1d"
          }}
        >

          {
            enabled
            ? "ACTIVE"
            : "OFFLINE"
          }

        </span>


      </div>





      {/* WALLET */}


      <div style={grid}>


        <WalletBox
          title="Disponible"
          value={
            wallet.balance_available
          }
          icon="💰"
          money={money}
        />


        <WalletBox
          title="Bloqué en jeu"
          value={
            wallet.balance_locked
          }
          icon="🔒"
          money={money}
        />



        <div style={box}>

          <span style={label}>
            Bot
          </span>

          <strong>
            #9999
          </strong>

        </div>



        <div style={box}>

          <span style={label}>
            Système
          </span>


          <strong>
            #7777
          </strong>

        </div>


      </div>





      <hr style={divider}/>





      <SettingsSection
        enabled={enabled}
        setEnabled={setEnabled}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        spawnRate={spawnRate}
        setSpawnRate={setSpawnRate}
        maxBots={maxBots}
        setMaxBots={setMaxBots}
        save={handleSaveSettings}
        loading={actionLoading}
      />






      <MoneyAction
        title="💰 Créditer Wallet IA"
        value={creditAmount}
        setValue={setCreditAmount}
        action={handleCredit}
        button="Créditer #9999"
        color="#2563eb"
      />



      <MoneyAction
        title="⬇️ Débiter Wallet IA"
        value={debitAmount}
        setValue={setDebitAmount}
        action={handleDebit}
        button="Débiter #9999"
        color="#dc2626"
      />



      <MoneyAction
        title="🏦 Vers système"
        value={transferAmount}
        setValue={setTransferAmount}
        action={handleTransfer}
        button="Transférer #7777"
        color="#d97706"
      />





      <button
        style={refreshBtn}
        onClick={refreshAI}
      >
        🔄 Actualiser
      </button>



    </div>

  );

}






function WalletBox({
  title,
  value,
  icon,
  money
}){


return (

<div style={box}>

<span style={label}>
{title}
</span>


<strong>
{icon}
{" "}
{money(
 Number(value || 0)
)}
</strong>


</div>

);


}







function MoneyAction({
title,
value,
setValue,
action,
button,
color
}){


return (

<div style={section}>


<h3>
{title}
</h3>


<input
type="number"
value={value}
onChange={
e=>setValue(e.target.value)
}
placeholder="Montant"
style={input}
/>



<button
style={{
...blueBtn,
background:color
}}
onClick={action}
>

{button}

</button>


</div>


);


}







function SettingsSection({
enabled,
setEnabled,
difficulty,
setDifficulty,
spawnRate,
setSpawnRate,
maxBots,
setMaxBots,
save,
loading
}){


return (

<div style={section}>


<h3>
⚙️ Configuration IA
</h3>


<label>
Activer IA
</label>


<input
type="checkbox"
checked={enabled}
onChange={
e=>setEnabled(e.target.checked)
}
/>



<label>
Difficulté {difficulty}%
</label>


<input
type="range"
min="10"
max="100"
value={difficulty}
onChange={
e=>setDifficulty(Number(e.target.value))
}
/>



<label>
Spawn Rate {spawnRate}%
</label>


<input
type="range"
min="0"
max="100"
value={spawnRate}
onChange={
e=>setSpawnRate(Number(e.target.value))
}
/>



<label>
Max Bots
</label>


<input
type="number"
value={maxBots}
onChange={
e=>setMaxBots(Number(e.target.value))
}
style={input}
/>



<button
style={saveBtn}
onClick={save}
disabled={loading}
>
💾 Enregistrer
</button>


</div>


);


}






const card = {
background:"#1e293b",
color:"#fff",
padding:20,
borderRadius:14,
display:"flex",
flexDirection:"column",
gap:16
};


const header={
display:"flex",
justifyContent:"space-between",
alignItems:"center"
};


const badge={
padding:"6px 12px",
borderRadius:999,
fontWeight:"bold"
};


const grid={
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
gap:10
};


const box={
background:"#0f172a",
padding:12,
borderRadius:10
};


const label={
display:"block",
opacity:.7,
fontSize:12,
marginBottom:5
};


const section={
display:"flex",
flexDirection:"column",
gap:10
};


const input={
padding:10,
borderRadius:10,
border:"none",
background:"#0f172a",
color:"#fff"
};


const divider={
border:"1px solid rgba(255,255,255,.08)"
};


const saveBtn={
padding:12,
border:"none",
borderRadius:10,
background:"#7c3aed",
color:"#fff",
cursor:"pointer"
};


const blueBtn={
padding:12,
border:"none",
borderRadius:10,
color:"#fff",
cursor:"pointer"
};


const refreshBtn={
padding:12,
border:"none",
borderRadius:10,
background:"#16a34a",
color:"#fff",
cursor:"pointer"
};