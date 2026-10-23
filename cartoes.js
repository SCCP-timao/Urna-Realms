// Desenho do título (frente e verso), selo de segurança e leitura do PNG.
const CHIP = {x:40, y:900, c:28, W:900, H:1160};
const hojeStr = new Date().toLocaleDateString("pt-BR");

function bitsDoToken(token){
  const p = token.split("-");
  let b = (+p[0]).toString(2).padStart(14, "0");
  for(const h of p[1]) b += parseInt(h, 16).toString(2).padStart(4, "0");
  return b + "10";
}
function tokenDosBits(b){
  if(b.length !== 64 || b.slice(62) !== "10") return null;
  const n = parseInt(b.slice(0, 14), 2);
  if(n > 9999) return null;
  let s = ""; for(let i = 14; i < 62; i += 4) s += parseInt(b.slice(i, i + 4), 2).toString(16);
  return String(n).padStart(4, "0") + "-" + s;
}

function campo(x, r, v, px, py, tam){
  x.fillStyle = "#46607a"; x.font = "bold 16px Arial"; x.fillText(r, px, py);
  x.fillStyle = "#111"; x.font = "bold " + (tam || 34) + "px Arial"; x.fillText(v, px, py + 40);
}

function frente(c, nome, num){
  c.width = 900; c.height = 560; const x = c.getContext("2d");
  const g = x.createLinearGradient(0,0,900,560); g.addColorStop(0,"#fdf6d8"); g.addColorStop(1,"#cfe6f7");
  x.fillStyle = g; x.fillRect(0,0,900,560);
  x.fillStyle = "#0b4f8a"; x.fillRect(0,0,900,110);
  x.fillStyle = "#fff"; x.font = "bold 42px Arial"; x.fillText("TÍTULO DE ELEITOR", 40, 62);
  x.font = "18px Arial"; x.fillText("SIMULAÇÃO · SEM VALIDADE OFICIAL", 40, 92);
  x.beginPath(); x.arc(820,55,34,0,7); x.fillStyle = "#f2c200"; x.fill();
  x.strokeStyle = "#0b4f8a"; x.lineWidth = 7; x.beginPath(); x.moveTo(804,56); x.lineTo(816,70); x.lineTo(840,40); x.stroke();
  campo(x, "NOME", nome.toUpperCase(), 40, 170, nome.length > 22 ? 28 : 34);
  campo(x, "Nº DO TÍTULO", num, 40, 275, 46);
  campo(x, "ZONA", "001", 330, 275); campo(x, "SEÇÃO", "0001", 480, 275);
  campo(x, "EMISSÃO", hojeStr, 40, 390, 30); campo(x, "ELEIÇÃO", "Presidencial (simulada)", 330, 390, 30);
  x.setLineDash([8,6]); x.strokeStyle = "#46607a"; x.lineWidth = 2; x.strokeRect(710,140,150,190); x.setLineDash([]);
  x.fillStyle = "#8d9285"; x.beginPath(); x.arc(785,215,32,0,7); x.fill(); x.beginPath(); x.ellipse(785,320,55,45,0,Math.PI,0); x.fill();
  x.fillStyle = "#0b4f8a"; x.fillRect(0,500,900,60);
  x.fillStyle = "#fff"; x.font = "16px Arial"; x.fillText("Documento fictício para uso exclusivo nesta votação.", 40, 536);
}

function verso(c, nome, num, token){
  c.width = 900; c.height = 560; const x = c.getContext("2d");
  const g = x.createLinearGradient(0,0,900,560); g.addColorStop(0,"#0b4f8a"); g.addColorStop(1,"#1d7bc4");
  x.fillStyle = g; x.fillRect(0,0,900,560);
  x.fillStyle = "#fff"; x.font = "bold 34px Arial"; x.fillText("COMO VOTAR", 40, 70);
  x.font = "24px Arial";
  ["1. Abra o site e toque em Adicionar título.", "2. Envie este arquivo PNG (inteiro, sem cortar).", "3. Confirme e digite o número do candidato.", "4. Cada título vota uma única vez. Não compartilhe."].forEach((t,i) => x.fillText(t, 40, 130 + i*42));
  // selo de segurança: é a chave pessoal deste título
  x.fillStyle = "#fff"; x.fillRect(28, 288, 248, 248);
  const b = bitsDoToken(token); x.fillStyle = "#111";
  for(let i = 0; i < 64; i++) if(b[i] === "1") x.fillRect(CHIP.x + (i % 8) * CHIP.c, 300 + Math.floor(i / 8) * CHIP.c, CHIP.c, CHIP.c);
  x.fillStyle = "#fff"; x.font = "bold 26px Arial"; x.fillText("SELO DE SEGURANÇA", 300, 330);
  x.font = "21px Arial"; x.fillText("Pessoal e intransferível.", 300, 370);
  x.fillText("Não corte nem edite o arquivo.", 300, 402);
  x.font = "bold 26px Arial"; x.fillText("Nº " + num, 300, 470);
  x.font = "22px Arial"; x.fillText(nome, 300, 505);
  x.font = "15px Arial"; x.fillText(location.origin, 300, 540);
}

function baixar(d){
  const a = document.createElement("canvas"), b = document.createElement("canvas");
  frente(a, d.nome, d.numero); verso(b, d.nome, d.numero, d.token);
  const t = document.createElement("canvas"); t.width = CHIP.W; t.height = CHIP.H;
  const x = t.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, CHIP.W, CHIP.H);
  x.drawImage(a, 0, 0); x.drawImage(b, 0, 600);
  const l = document.createElement("a");
  l.download = "titulo-" + d.numero + "-" + d.nome.replace(/\s+/g, "-") + ".png";
  l.href = t.toDataURL("image/png"); l.click();
}

// Lê a chave do selo de segurança de um PNG enviado. Devolve "0000-xxxxxxxxxxxx" ou null.
function lerToken(img){
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  if(!W || !H || Math.abs(W / H - CHIP.W / CHIP.H) > 0.03) return null;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const sx = W / CHIP.W, sy = H / CHIP.H, med = [];
  for(let i = 0; i < 64; i++){
    const cx = (CHIP.x + (i % 8) * CHIP.c + CHIP.c / 2) * sx, cy = (CHIP.y + Math.floor(i / 8) * CHIP.c + CHIP.c / 2) * sy;
    const w = Math.max(2, Math.round(CHIP.c * 0.5 * sx)), h = Math.max(2, Math.round(CHIP.c * 0.5 * sy));
    const d = x.getImageData(Math.round(cx - w / 2), Math.round(cy - h / 2), w, h).data;
    let s = 0; for(let k = 0; k < d.length; k += 4) s += d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11;
    med.push(s / (d.length / 4));
  }
  const mn = Math.min.apply(null, med), mx = Math.max.apply(null, med);
  if(mx - mn < 80) return null;
  const lim = (mn + mx) / 2;
  return tokenDosBits(med.map(v => v < lim ? "1" : "0").join(""));
}
