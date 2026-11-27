// Mile 14: chuyển cây FBX (Gleditsia, 15–27 MB, hàng nghìn nhóm) thành file nhị phân gọn cho WebGL phần mềm.
// Chạy: node scripts/mile14_trees.mjs  → public/mile14/treeN.bin
// Định dạng: Uint32 [nBark, nLeaf] (số đỉnh), rồi Float32 vị trí (đơn vị gốc / chiều cao = 1), rồi Int8 pháp tuyến ×127.
import fs from 'fs';
globalThis.self = globalThis; globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {}, addEventListener(){}, removeEventListener(){}, setAttribute(){} }), createElement: () => ({ style:{}, addEventListener(){}, removeEventListener(){}}) };
const THREE = await import('three');
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
const LEAF_KEEP = Number(process.env.LEAF_KEEP ?? 0.5);
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
for (const name of ['tree1', 'tree2', 'tree5']) {
  const buf = fs.readFileSync(`public/mile14/${name}.fbx`);
  const g = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  g.updateMatrixWorld(true);
  const P = [[], []], N = [[], []];
  let tri = 0;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry; if (!geo.attributes.normal) geo.computeVertexNormals();
    const mats = [].concat(o.material); const leafM = mats.map((m) => !!m.alphaMap);
    const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.index ? geo.index.count : geo.attributes.position.count, materialIndex: 0 }];
    const idx = geo.index?.array; const pos = geo.attributes.position, nor = geo.attributes.normal;
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    for (const gr of groups) {
      const L = leafM[gr.materialIndex ?? 0] ? 1 : 0;
      for (let i = gr.start; i + 2 < gr.start + gr.count; i += 3, tri++) {
        if (L && rnd(tri) > LEAF_KEEP) continue;
        for (let j = 0; j < 3; j++) {
          const k = idx ? idx[i + j] : i + j;
          v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld); P[L].push(v.x, v.y, v.z);
          n.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize(); N[L].push(n.x, n.y, n.z);
        }
      }
    }
  });
  const all = P[0].concat(P[1]);
  let minY = Infinity, maxY = -Infinity, cx = 0, cz = 0;
  for (let i = 0; i < all.length; i += 3) { minY = Math.min(minY, all[i + 1]); maxY = Math.max(maxY, all[i + 1]); }
  // tâm thân cây: trung bình đỉnh vỏ ở 1 % chiều cao dưới cùng
  let cnt = 0; for (let i = 0; i < P[0].length; i += 3) if (P[0][i + 1] < minY + (maxY - minY) * 0.01) { cx += P[0][i]; cz += P[0][i + 2]; cnt++; }
  cx /= cnt || 1; cz /= cnt || 1;
  const H = maxY - minY;
  const pos = new Float32Array(all.length);
  for (let i = 0; i < all.length; i += 3) { pos[i] = (all[i] - cx) / H; pos[i + 1] = (all[i + 1] - minY) / H; pos[i + 2] = (all[i + 2] - cz) / H; }
  const nrm = new Int8Array(N[0].concat(N[1]).map((x) => Math.round(x * 127)));
  const head = new Uint32Array([P[0].length / 3, P[1].length / 3]);
  const out = Buffer.concat([Buffer.from(head.buffer), Buffer.from(pos.buffer), Buffer.from(nrm.buffer)]);
  fs.writeFileSync(`public/mile14/${name}.bin`, out);
  console.log(name, 'vỏ', head[0] / 3, 'lá', head[1] / 3, 'tam giác,', (out.length / 1e6).toFixed(1), 'MB');
}
