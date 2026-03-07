<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<title>VoidCraft - Loja</title>

<style>

body{
background:#0f0f0f;
color:white;
font-family:Arial;
margin:0;
}

header{
background:#161616;
padding:20px;
text-align:center;
font-size:28px;
font-weight:bold;
}

.container{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
gap:20px;
padding:30px;
}

.card{
background:#1c1c1c;
border-radius:10px;
padding:15px;
text-align:center;
box-shadow:0 0 10px rgba(0,0,0,0.5);
}

.card img{
width:100%;
border-radius:8px;
}

.price{
font-size:22px;
color:#00ff88;
margin:10px 0;
}

button{
background:#ffb300;
border:none;
padding:10px 20px;
border-radius:6px;
cursor:pointer;
font-weight:bold;
}

button:hover{
background:#ffaa00;
}

</style>
</head>

<body>

<header>
VOIDCRAFT • LOJA OFICIAL
</header>

<div class="container">

<div class="card">
<img src="cpvp.png">
<h2>VIP CPVP</h2>
<p>Resgate 1x por semana</p>
<div class="price">R$19,90</div>
<button onclick="comprar('VIP CPVP')">Comprar</button>
</div>

<div class="card">
<img src="netherite.png">
<h2>VIP NETHERITE OP</h2>
<p>Resgate 1x por semana</p>
<div class="price">R$15,90</div>
<button onclick="comprar('VIP NETHERITE')">Comprar</button>
</div>

<div class="card">
<img src="assassino.png">
<h2>VIP ASSASSINO</h2>
<p>Resgate 1x por semana</p>
<div class="price">R$24,90</div>
<button onclick="comprar('VIP ASSASSINO')">Comprar</button>
</div>

<div class="card">
<img src="inicial.png">
<h2>KIT INICIAL</h2>
<p>Resgate semanal</p>
<div class="price">R$4,90</div>
<button onclick="comprar('KIT INICIAL')">Comprar</button>
</div>

</div>

<script>

function comprar(vip){

alert("Você selecionou: "+vip)

window.location.href="https://discord.gg/seu-servidor"

}

</script>

</body>
</html>
