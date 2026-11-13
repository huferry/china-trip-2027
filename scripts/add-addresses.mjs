/**
 * Populate Chinese addresses for all places missing address_zh in Firestore.
 *
 * Usage: node scripts/add-addresses.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const ADDRESSES = {
  // === SHENZHEN — Places ===
  'sz-003': '深圳市南山区后海滨路深圳湾',
  'sz-004': '深圳市福田区福中一路2001号',
  'sz-005': '深圳市坪山区燕子岭路深圳自然博物馆',
  'sz-006': '深圳市南山区锦绣北街2号华侨城创意文化园',
  'sz-007': '深圳市福田区福中路市民中心A区',
  'sz-009': '深圳市龙岗区龙岗街道罗瑞合北街1号',
  'sz-010': '深圳市坪山区大万路33号大万世居',
  'sz-016': '深圳市大鹏新区鹏城社区大鹏所城',
  'sz-019': '深圳市福田区华强北路',
  'sz-020': '深圳市南山区后海大道2266号深圳湾万象城',
  'sz-022': '深圳市南山区粤海街道大冲社区深南大道9668号',
  'sz-023': '深圳市福田区福华三路与金田路交汇处COCO Park',
  'sz-024': '深圳市罗湖区东门中路东门步行街',
  'sz-026': '深圳市福田区皇岗路5001号深业上城',
  'sz-028': '深圳市南山区海德三道166号卓悦中心',
  'sz-029': '深圳市罗湖区和平路1号罗湖商业城',

  // === SHENZHEN — Restaurants ===
  'sz-030': '深圳市南山区望海路与蛇口港湾大道交汇处',
  'sz-031': '深圳市福田区福华三路与益田路交汇处',
  'sz-032': '深圳市福田区益田路3008号皇都广场',
  'sz-033': '深圳市福田区香蜜湖街道深南大道6003号',
  'sz-034': '深圳市福田区金田路3038号现代国际大厦',
  'sz-035': '深圳市福田区福华路福华大厦附近',
  'sz-036': '深圳市南山区南头街道中山公园南广场',
  'sz-037': '深圳市南山区滨海大道3166号',
  'sz-038': '深圳市南山区南海大道与工业七路交汇处',
  'sz-039': '深圳市罗湖区深南东路',
  'sz-040': '深圳市福田区福民路与福华路交汇处',
  'sz-041': '深圳市福田区皇岗路5001号深业上城',
  'sz-042': '深圳市罗湖区文锦中路1003号',
  'sz-043': '深圳市福田区景田路78号',
  'sz-044': '深圳市福田区福华路与民田路交汇处',

  // === SHENZHEN — Zhuhai day trip places ===
  'sz-045': '珠海市香洲区情侣中路',
  'sz-046': '珠海市香洲区野狸岛',
  'sz-047': '珠海市香洲区石景山路石景山公园',
  'sz-048': '珠海市金湾区金湾市民艺术中心',

  // === GUANGZHOU — Places ===
  'gz-002': '广州市海珠区天字码头或大沙头码头',
  'gz-004': '广州市天河区珠江西路1号广州大剧院',
  'gz-009': '广州市天河区珠江东路2号广东省博物馆',
  'gz-012': '广州市越秀区六榕路87号',
  'gz-015': '广州市海珠区新滘中路168号海珠湿地公园',
  'gz-016': '广州市荔湾区龙津西路荔枝湾涌',
  'gz-017': '广州市天河区火炉山森林公园',
  'gz-019': '广州市荔湾区芳村大道中311号芳村茶叶市场',
  'gz-020': '广州市荔湾区华林寺前31号',
  'gz-021': '广州市荔湾区上九路上下九步行街',
  'gz-022': '广州市天河区天河路383号太古汇',
  'gz-023': '广州市越秀区一德路',
  'gz-024': '广州市天河区天河路218号天环广场',
  'gz-025': '广州市天河区珠江新城珠江东路6号K11',
  'gz-026': '广州市越秀区东山口',
  'gz-027': '广州市天河区天河路208号天河城',
  'gz-043': '广东省江门市开平市塘口镇',

  // === GUANGZHOU — Restaurants ===
  'gz-028': '广州市天河区珠江新城珠江西路5号广州文华东方酒店',
  'gz-029': '广州市天河区天河路383号太古汇L3层',
  'gz-030': '广州市天河区冼村路1号天河北路保利克洛维广场',
  'gz-031': '广州市天河区天河路208号天河城4楼',
  'gz-032': '广州市越秀区东风东路836号',
  'gz-033': '广州市天河区珠江新城华夏路16号富力盈凯广场',
  'gz-034': '广州市荔湾区沙面南街1号白天鹅宾馆',
  'gz-035': '广州市越秀区文昌南路2号',
  'gz-036': '广州市荔湾区上下九步行街第十甫路20号',
  'gz-037': '广州市荔湾区龙津西路151号',
  'gz-038': '广州市荔湾区芳村花地大道',
  'gz-039': '广州市越秀区惠福东路462号',
  'gz-040': '广州市天河区体育东路112号',
  'gz-041': '广州市越秀区上下九步行街上九路79号',
  'gz-042': '广州市荔湾区上下九步行街第十甫路47号',

  // === FOSHAN ===
  'fs-002': '佛山市禅城区祖庙路21号祖庙内',
  'fs-003': '佛山市顺德区均安镇李小龙乐园',
  'fs-004': '佛山市禅城区祖庙大街2号岭南天地',
  'fs-007': '佛山市顺德区杏坛镇逢简村',
  'fs-008': '佛山市南海区西樵镇西樵山风景名胜区',
  'fs-009': '佛山市顺德区大良镇华盖路步行街',

  // === User-added places (Firestore auto-IDs) ===
  '495jYBwImd9TWZSYqV4K': '深圳市福田区深南大道6013号中国凤凰大厦旁',       // Shenzhen Energy Mansion
  'AFtyPyMIB9isbfvIkluo': '深圳市南山区沙河西路与东滨路交汇处人才公园',      // Shenzhen Talent Park
  'Ff91tunnCLJdTpYM7z3h': '广州市天河区中山大道中88号嘉禾点心杨箕店',        // Jia He Wei Dim Sum
  'GCtLTOIdFk5OE2VisoZL': '深圳市福田区益田路卓越时代广场',                 // Da Ge Fan
  'OBFbA4sN9fXARbO5QjYV': '广州市海珠区小洲村',                            // Xiaozhou Village
  'U5o1cSKHBr5ijyJmnBi3': '佛山市禅城区福贤路东华里',                       // Donghua Li
};

async function main() {
  const snap = await db.collection('places').get();
  let updated = 0;

  for (const doc of snap.docs) {
    const addr = ADDRESSES[doc.id];
    if (!addr) continue;
    const data = doc.data();
    if (data.address_zh === addr) {
      console.log(`  Already set: ${doc.id}`);
      continue;
    }
    await doc.ref.update({ address_zh: addr });
    console.log(`  Updated ${doc.id} (${data.name_zh || data.name})`);
    updated++;
  }

  console.log(`\nDone: ${updated} addresses added.`);
}

main().catch(err => { console.error(err); process.exit(1); });
