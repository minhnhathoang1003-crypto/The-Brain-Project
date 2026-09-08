// Công cụ cho file .ico: liệt kê các khung ảnh bên trong và tách chúng ra PNG.
//   node scripts/ico.cjs <file.ico>                     — chỉ liệt kê
//   node scripts/ico.cjs <file.ico> <file.png>          — tách khung lớn nhất
//   node scripts/ico.cjs <file.ico> <thu-muc> 16 32 48  — tách nhiều cỡ thành <thu-muc>/icon-<cỡ>.png
const fs=require('node:fs'), path=require('node:path');
const [,,input,output,...sizes]=process.argv;
if(!input){console.error('Cách dùng: node scripts/ico.cjs <file.ico> [png-hoặc-thư-mục] [cỡ...]');process.exit(1);}
const buf=fs.readFileSync(input);
if(buf.readUInt16LE(0)!==0||buf.readUInt16LE(2)!==1){console.error('Không phải file .ico hợp lệ.');process.exit(1);}
const frames=[];
for(let i=0;i<buf.readUInt16LE(4);i++){
  const at=6+i*16, size=buf.readUInt32LE(at+8), offset=buf.readUInt32LE(at+12);
  const data=buf.subarray(offset,offset+size);
  frames.push({width:buf[at]||256,height:buf[at+1]||256,bytes:size,
    png:data.length>8&&data.readUInt32BE(0)===0x89504e47,data});
}
for(const f of frames)console.log(`${String(f.width).padStart(4)} x ${String(f.height).padEnd(4)}  ${f.png?'PNG':'BMP'}  ${f.bytes} bytes`);
if(!output)return;
const pick=w=>{const f=frames.find(f=>f.png&&f.width===w);if(!f)throw new Error(`Không có khung PNG cỡ ${w}.`);return f;};
if(sizes.length){
  fs.mkdirSync(output,{recursive:true});
  for(const raw of sizes){const f=pick(Number(raw));const file=path.join(output,`icon-${f.width}.png`);fs.writeFileSync(file,f.data);console.log(`→ ${file}`);}
} else {
  const best=frames.filter(f=>f.png).sort((a,b)=>b.width-a.width)[0];
  if(!best)throw new Error('Không có khung PNG nào để tách.');
  fs.writeFileSync(output,best.data);console.log(`→ ${output} (${best.width}px)`);
}
