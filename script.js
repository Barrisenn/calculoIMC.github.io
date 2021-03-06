let botaoCalcular = document.getElementById("btnCalcular");

function calculandoIMC() {
  let peso = document.getElementById("peso").value;
  let altura = document.getElementById("altura").value/100;
  let resultado = document.getElementById("resultado");
  
  if(altura !== "" && peso !== "") {
    let imc = (peso / (altura * altura)).toFixed(2);
    let mensagem = "";
    
    if(imc < 18.5) {
      mensagem = "Abaixo Do Peso!"
    }else if(imc < 25) {
      mensagem = "Com o peso ideal!"    
    }else if(imc < 30) {
      mensagem = "Você está levemente acima do peso!"
    }else if(imc < 35) {
      mensagem = "Obesidade Grau I"
    }else if(imc < 40) {
      mensagem = "Obesidade Grau II"
    }else{
      mensagem = "Cuidado, obesidade grau III"
    }
    
    resultado.textContent = `Seu IMC é ${imc}. ${mensagem}`;
  }else{
    resultado.textContent = "Preencha Todos Os Campos!!"  
  }
    
}

botaoCalcular.addEventListener("click", calculandoIMC);