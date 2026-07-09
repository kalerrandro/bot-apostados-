let bala=document.getElementById("bala");
let entrar=document.getElementById("entrar");

let x=0;

let carregar=setInterval(()=>{

x++;

bala.style.left=x+"%";

if(x>=95){

clearInterval(carregar);

entrar.style.display="inline-block";

}

},50);

entrar.onclick=()=>{

document.getElementById("loading").style.display="none";

document.getElementById("menu").style.display="block";

};
