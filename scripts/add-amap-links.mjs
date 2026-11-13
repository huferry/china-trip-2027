/**
 * Populate Amap (高德地图) POI links and Chinese addresses for places in Firestore.
 *
 * Usage: node scripts/add-amap-links.mjs
 *
 * Requires: ./service-account.json (Firebase service account key)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Amap POI IDs collected from ranking pages and web search
const AMAP_DATA = {
  // --- Shenzhen ---
  'sz-001': { poi: 'B0MGXNX3FX', addr: '深圳市福田区益田路5033号平安金融中心116层' },
  'sz-002': { poi: 'B02F306L50', addr: '深圳市福田区福中三路市民中心' },
  'sz-008': { poi: 'B02F37U89L', addr: '深圳市南山区南头街道南头古城' },
  'sz-011': { poi: 'B0FFFRDS71', addr: '深圳市南山区滨海大道深圳湾公园' },
  'sz-012': { poi: 'B02F306L5G', addr: '深圳市福田区红荔路6030号莲花山公园' },
  'sz-013': { poi: 'B0G1DSEKCI', addr: '深圳市光明区虹桥公园' },
  'sz-014': { poi: 'B02F37T4NJ', addr: '深圳市罗湖区莲塘街道仙湖路160号' },
  'sz-015': { poi: 'B02F300115', addr: '深圳市盐田区梧桐山风景区' },
  'sz-017': { poi: 'B02F3001AA', addr: '深圳市盐田区大梅沙海滨公园' },
  'sz-018': { poi: 'B02F37U63X', addr: '深圳市南山区塘朗山公园' },
  'sz-021': { poi: 'B02F37VM2F', addr: '深圳市龙岗区布吉街道大芬村' },
  'sz-025': { poi: 'B02F302560', addr: '深圳市南山区蛇口望海路1128号海上世界' },
  'sz-027': { poi: 'B0GDFSX0T6', addr: '深圳市宝安区海天路欢乐港湾' },

  // --- Guangzhou ---
  'gz-001': { poi: 'B00140WBI1', addr: '广州市海珠区阅江西路222号广州塔' },
  'gz-003': { poi: 'B00140WGV9', addr: '广州市天河区珠江新城花城广场' },
  'gz-005': { poi: 'B00140UHIZ', addr: '广州市越秀区一德路旧部前56号' },
  'gz-006': { poi: 'B00140W60B', addr: '广州市海珠区海心沙亚运公园' },
  'gz-007': { poi: 'B00140H88E', addr: '广州市荔湾区中山七路恩龙里34号' },
  'gz-008': { poi: 'B0FFFAJYVI', addr: '广州市荔湾区沙面岛' },
  'gz-010': { poi: 'B0014021B3', addr: '广州市越秀区解放北路867号' },
  'gz-011': { poi: 'B0IUPDSJHU', addr: '广州市荔湾区恩宁路永庆坊' },
  'gz-013': { poi: 'B0014014AD', addr: '广州市白云区白云山风景名胜区' },
  'gz-014': { poi: 'B00140BNNF', addr: '广州市越秀区解放北路960号越秀公园' },
  'gz-018': { poi: 'B00141RH20', addr: '广州市越秀区北京路步行街' },

  // --- Foshan ---
  'fs-001': { poi: 'B02F50768W', addr: '佛山市禅城区祖庙路21号' },
  'fs-005': { poi: 'B02F5076BA', addr: '佛山市禅城区石湾镇街道高庙路6号' },
  'fs-006': { poi: 'B02F50766S', addr: '佛山市顺德区大良街道清晖路23号' },
};

async function main() {
  const snap = await db.collection('places').get();
  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const id = doc.id;
    const data = doc.data();
    const amapData = AMAP_DATA[id];

    if (!amapData) {
      skipped++;
      continue;
    }

    const updates = {};
    const amapUrl = `https://www.amap.com/place/${amapData.poi}`;

    if (data.links?.amap !== amapUrl) {
      updates['links.amap'] = amapUrl;
    }
    if (amapData.addr && data.address_zh !== amapData.addr) {
      updates.address_zh = amapData.addr;
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log(`  Updated ${id} (${data.name_zh || data.name})`);
      updated++;
    } else {
      console.log(`  Already up-to-date: ${id}`);
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped (no Amap data).`);
}

main().catch(err => { console.error(err); process.exit(1); });
