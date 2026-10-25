import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(key), projectId: 'huferry-china-trip' });
const db = getFirestore();

// Trip.com links for each place (links.tripcom field)
const tripcomLinks = {
  // Shenzhen
  'sz-001': 'https://www.trip.com/travel-guide/attraction/shenzhen/ping-an-finance-center-free-sky-46835160/',
  'sz-002': 'https://www.trip.com/travel-guide/attraction/shenzhen/shenzhen-civic-center-18126806/',
  'sz-004': 'https://www.trip.com/travel-guide/attraction/shenzhen/shenzhen-library-48259612/',
  'sz-005': 'https://www.trip.com/travel-guide/attraction/shenzhen/shenzhen-natural-history-museum-140784214/',
  'sz-006': 'https://www.trip.com/travel-guide/attraction/shenzhen/oct-loft-18097342/',
  'sz-007': 'https://www.trip.com/travel-guide/attraction/shenzhen/shenzhen-museum-13789819/',
  'sz-008': 'https://www.trip.com/travel-guide/attraction/shenzhen/nantou-ancient-city-80146/',
  'sz-009': 'https://www.trip.com/travel-guide/attraction/shenzhen/hehu-hakka-village-83257/',
  'sz-011': 'https://www.trip.com/travel-guide/attraction/shenzhen/shenzhen-bay-park-18119222/',
  'sz-012': 'https://www.trip.com/travel-guide/attraction/shenzhen/lian-hua-shan-park-83245/',
  'sz-014': 'https://www.trip.com/travel-guide/attraction/shenzhen/fairy-lake-botanical-garden-75873/',
  'sz-015': 'https://www.trip.com/travel-guide/attraction/shenzhen/wutong-mountain-10558975/',
  'sz-016': 'https://www.trip.com/travel-guide/attraction/shenzhen/dapeng-fortress-83236/',
  'sz-017': 'https://www.trip.com/travel-guide/attraction/shenzhen/dameisha-coastal-park-76815/',
  'sz-018': 'https://www.trip.com/travel-guide/attraction/shenzhen/mount-tanglang-country-park-10539169/',
  'sz-021': 'https://www.trip.com/travel-guide/attraction/shenzhen/dafen-oil-painting-village-83239/',
  'sz-024': 'https://www.trip.com/travel-guide/attraction/shenzhen/dongmen-pedestrian-street-10558976/',
  'sz-025': 'https://www.trip.com/travel-guide/attraction/shenzhen/sea-world-10558635/',
  'sz-027': 'https://www.trip.com/travel-guide/attraction/shenzhen/oct-harbour-10762987/',
  'sz-030': 'https://www.trip.com/restaurant/china/shenzhen/detail/the-bay-by-chef-fei-133678229/',
  'sz-031': 'https://www.trip.com/restaurant/china/shenzhen/detail/yun-jing-77903905/',
  'sz-033': 'https://www.trip.com/restaurant/china/shenzhen/detail/xin-rong-ji-67820771/',
  'sz-034': 'https://www.trip.com/restaurant/china/shenzhen/detail/runyuan-siji-yeziji-11324932/',
  'sz-035': 'https://www.trip.com/restaurant/china/shenzhen/detail/city-130232826/',
  'sz-036': 'https://www.trip.com/restaurant/china/shenzhen/detail/Fan%20Lou%20(Huaqiang%20North)-57318209/',
  'sz-039': 'https://www.trip.com/restaurant/china/shenzhen/detail/chuxianglou-dim-sum-teahouse-143347119/',
  'sz-044': 'https://www.trip.com/restaurant/china/shenzhen/detail/chun-man-yuan-45457879/',
  'sz-045': 'https://www.trip.com/travel-guide/attraction/zhuhai/lovers-road-10558923/',
  'sz-046': 'https://www.trip.com/travel-guide/attraction/zhuhai/zhuhai-opera-house-30766708/',
  'sz-047': 'https://www.trip.com/travel-guide/attraction/zhuhai/zhuhai-shijingshan-tourist-cableway-101259/',

  // Foshan
  'fs-001': 'https://www.trip.com/travel-guide/attraction/foshan/foshan-ancestral-temple-81417/',
  'fs-002': 'https://www.trip.com/travel-guide/attraction/foshan/wong-fei-hung-lion-dance-martial-arts-museum-83006/',
  'fs-003': 'https://www.trip.com/travel-guide/attraction/foshan/bruce-lee-park-91568/',
  'fs-004': 'https://www.trip.com/travel-guide/attraction/foshan/fo-shan-lingnan-tiandi-10539309/',
  'fs-005': 'https://www.trip.com/travel-guide/attraction/foshan/ancient-nanfeng-kiln-82948/',
  'fs-006': 'https://www.trip.com/travel-guide/attraction/foshan/qinghui-garden-museum-82949/',
  'fs-007': 'https://www.trip.com/travel-guide/attraction/foshan/fengjian-water-town-92628/',
  'fs-008': 'https://www.trip.com/travel-guide/attraction/foshan/xiqiao-mountain-scenic-area-81414/',
  'fs-009': 'https://www.trip.com/travel-guide/attraction/foshan/huagai-road-foshan-characteristic-culture-street-95312/',

  // Guangzhou
  'gz-001': 'https://www.trip.com/travel-guide/attraction/guangzhou/canton-tower-90706/',
  'gz-002': 'https://www.trip.com/travel-guide/attraction/guangzhou/pearl-river-night-cruise-10758708/',
  'gz-003': 'https://www.trip.com/travel-guide/attraction/guangzhou/huacheng-square-92040/',
  'gz-004': 'https://www.trip.com/travel-guide/attraction/guangzhou/guangzhou-opera-house-opera-hall-80053308/',
  'gz-005': 'https://www.trip.com/travel-guide/attraction/guangzhou/sacred-heart-cathedral-guangzhou-76956/',
  'gz-006': 'https://www.trip.com/travel-guide/attraction/guangzhou/haixinsha-island-13759436/',
  'gz-007': 'https://www.trip.com/travel-guide/attraction/guangzhou/chen-clan-ancestral-hall-76877/',
  'gz-008': 'https://www.trip.com/travel-guide/attraction/guangzhou/shamian-island-78476/',
  'gz-009': 'https://www.trip.com/travel-guide/attraction/guangzhou/guangdong-museum-76884/',
  'gz-010': 'https://www.trip.com/travel-guide/attraction/guangzhou/nanyue-king-museum-76901/',
  'gz-011': 'https://www.trip.com/travel-guide/attraction/guangzhou/xiguan-yongqingfang-tourist-area-58280089/',
  'gz-012': 'https://www.trip.com/travel-guide/attraction/guangzhou/temple-of-the-six-banyan-trees-76897/',
  'gz-013': 'https://www.trip.com/travel-guide/attraction/guangzhou/baiyun-mountain-76874/',
  'gz-014': 'https://www.trip.com/travel-guide/attraction/guangzhou/yuexiu-park-76904/',
  'gz-015': 'https://www.trip.com/travel-guide/attraction/guangzhou/haizhu-wetland-10523472/',
  'gz-016': 'https://www.trip.com/travel-guide/attraction/guangzhou/lychee-bay-13753879/',
  'gz-017': 'https://www.trip.com/travel-guide/attraction/guangzhou/huolu-mountain-forest-park-83762/',
  'gz-018': 'https://www.trip.com/travel-guide/attraction/guangzhou/beijing-road-pedestrian-street-97404/',
  'gz-020': 'https://www.trip.com/travel-guide/attraction/guangzhou/hualin-jadeware-street-10530571/',
  'gz-021': 'https://www.trip.com/travel-guide/attraction/guangzhou/shangxiajiu-pedestrian-street-10524177/',
  'gz-025': 'https://www.trip.com/travel-guide/attraction/guangzhou/chi-k11-art-space-guangzhou-71414831/',
  'gz-026': 'https://www.trip.com/travel-guide/attraction/guangzhou/dongshankou-56809964/',
  'gz-027': 'https://www.trip.com/travel-guide/attraction/guangzhou/grandview-mall-13415649/',
  'gz-028': 'https://www.trip.com/restaurant/china/guangzhou/detail/jiang-by-chef-fei-15354344/',
  'gz-029': 'https://www.trip.com/restaurant/china/guangzhou/detail/imperial-treasure-fine-chinese-cuisine-30623376/',
  'gz-030': 'https://www.trip.com/restaurant/china/guangzhou/detail/bingsheng-mansion-11479578/',
  'gz-031': 'https://www.trip.com/restaurant/china/guangzhou/detail/lei-garden-11473865/',
  'gz-032': 'https://www.trip.com/restaurant/china/guangzhou/detail/wisca-55313181/',
  'gz-033': 'https://www.trip.com/restaurant/china/guangzhou/detail/yu-yue-heen-11486375/',
  'gz-034': 'https://www.trip.com/restaurant/china/guangzhou/detail/hongtu-hall-30539774/',
  'gz-035': 'https://www.trip.com/restaurant/china/guangzhou/detail/guangzhou-restaurant-479108/',
  'gz-036': 'https://www.trip.com/restaurant/china/guangzhou/detail/tao-tao-ju-restaurant-478787/',
  'gz-037': 'https://www.trip.com/restaurant/china/guangzhou/detail/panxirestaurant-479103/',
  'gz-038': 'https://www.trip.com/restaurant/china/guangzhou/detail/fa-sing-garden-cantonese-cuisine-restauant-52550174/',
  'gz-039': 'https://www.trip.com/restaurant/china/guangzhou/detail/dian-dou-de-15357905/',
  'gz-041': 'https://www.trip.com/restaurant/china/guangzhou/detail/yin-ji-changfen-dian-shangjiu-road-branch-10561660/',
  'gz-042': 'https://www.trip.com/restaurant/china/guangzhou/detail/nan-xin-niunai-tianpin-zhuanjia-dessert-10561663/',
  'gz-043': 'https://www.trip.com/travel-guide/attraction/kaiping/kaiping-diaolou-81193/',
};

let updated = 0;
for (const [id, url] of Object.entries(tripcomLinks)) {
  await db.collection('places').doc(id).update({ 'links.tripcom': url });
  console.log(`✓ ${id}`);
  updated++;
}

console.log(`\nDone. Updated ${updated} places with Trip.com links.`);
