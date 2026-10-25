import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(key), projectId: 'huferry-china-trip' });
const db = getFirestore();

const updates = {
  // Shenzhen
  'sz-001': 'https://www.tripadvisor.com/Attraction_Review-g297415-d15239653-Reviews-Ping_An_Finance_Centre_Free_Sky_116_Observation_Deck_in_Shenzhen_China-Shenzhen_.html',
  'sz-002': 'https://www.tripadvisor.com/Attraction_Review-g297415-d8090201-Reviews-Shenzhen_Civic_Center-Shenzhen_Guangdong.html',
  'sz-003': 'https://www.tripadvisor.com/Attraction_Review-g297415-d2630813-Reviews-Shenzhen_Bay_Park-Shenzhen_Guangdong.html',
  'sz-004': 'https://www.tripadvisor.com/Attraction_Review-g297415-d9882806-Reviews-Shenzhen_Library-Shenzhen_Guangdong.html',
  // sz-005 Shenzhen Natural History Museum — keep official sz.gov.cn (no change)
  'sz-006': 'https://www.tripadvisor.com/Attraction_Review-g297415-d7371131-Reviews-OCT_Loft_Creative_Culture_Park-Shenzhen_Guangdong.html',
  'sz-007': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1842921-Reviews-Shenzhen_Museum-Shenzhen_Guangdong.html',
  'sz-008': 'https://www.tripadvisor.com/Attraction_Review-g297415-d26247580-Reviews-Nantou_Ancient_Town-Shenzhen_Guangdong.html',
  'sz-009': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1797565-Reviews-Crane_Lake_Hakka_Village-Shenzhen_Guangdong.html',
  'sz-010': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1797579-Reviews-Dawan_Building-Shenzhen_Guangdong.html',
  'sz-011': 'https://www.tripadvisor.com/Attraction_Review-g297415-d2630813-Reviews-Shenzhen_Bay_Park-Shenzhen_Guangdong.html',
  'sz-012': 'https://www.tripadvisor.com/Attraction_Review-g297415-d2051282-Reviews-Shenzhen_Lianhuashan_Park-Shenzhen_Guangdong.html',
  // sz-013 Hongqiao Park — keep official sz.gov.cn (no change)
  'sz-014': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1843199-Reviews-Xianhu_Botanical_Garden-Shenzhen_Guangdong.html',
  'sz-015': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1843641-Reviews-Wutong_Mountain-Shenzhen_Guangdong.html',
  'sz-016': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1795898-Reviews-Shenzhen_Dapeng_Fortress-Shenzhen_Guangdong.html',
  'sz-017': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1795837-Reviews-Dameisha_Coastal_Park-Shenzhen_Guangdong.html',
  'sz-018': 'https://www.tripadvisor.com/Attraction_Review-g297415-d4288999-Reviews-Tanglangshan_Country_Park-Shenzhen_Guangdong.html',
  'sz-019': 'https://www.tripadvisor.com/Attraction_Review-g297415-d3822181-Reviews-Huaqiangbei_Commercial_Street-Shenzhen_Guangdong.html',
  'sz-020': 'https://www.tripadvisor.com/Attraction_Review-g297415-d17642863-Reviews-Shenzhen_Bay_MIXC-Shenzhen_Guangdong.html',
  'sz-021': 'https://www.tripadvisor.com/Attraction_Review-g297415-d2051368-Reviews-Dafen_Oil_Painting_Village-Shenzhen_Guangdong.html',
  'sz-022': 'https://www.tripadvisor.com/Attraction_Review-g297415-d17822517-Reviews-Shenzhen_MixC_Mall-Shenzhen_Guangdong.html',
  'sz-023': 'https://www.tripadvisor.com/Attraction_Review-g297415-d3362245-Reviews-COCO_Park-Shenzhen_Guangdong.html',
  'sz-024': 'https://www.tripadvisor.com/Attraction_Review-g297415-d2587536-Reviews-Dong_Men_Pedestrian_Street-Shenzhen_Guangdong.html',
  'sz-025': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1563792-Reviews-Sea_World-Shenzhen_Guangdong.html',
  'sz-026': 'https://www.tripadvisor.com/Attraction_Review-g297415-d16894652-Reviews-Upperhills_Commercial_Complex-Shenzhen_Guangdong.html',
  'sz-027': 'https://www.tripadvisor.com/Attraction_Review-g297415-d8113653-Reviews-OCT_HARBOUR-Shenzhen_Guangdong.html',
  'sz-028': 'https://www.tripadvisor.com/Attraction_Review-g297415-d19175372-Reviews-One_Avenue-Shenzhen_Guangdong.html',
  'sz-029': 'https://www.tripadvisor.com/Attraction_Review-g297415-d1590980-Reviews-Luohu_Commerical_City-Shenzhen_Guangdong.html',
  'sz-030': 'https://www.mandarinoriental.com/en/shenzhen/futian/dine/the-bay-by-chef-fei',
  'sz-031': 'https://www.raffles.com/shenzhen/dining/yun-jing/',
  // sz-032 Chao Shang Chao — not found, skip
  // sz-033 Xin Rong Ji — not found, skip
  'sz-034': 'https://www.tripadvisor.com/Restaurant_Review-g297415-d4692194-Reviews-Run_Yuan_SiJi_Ye_ZiJi_ShaZui_Road-Shenzhen_Guangdong.html',
  'sz-035': 'https://www.tripadvisor.com/Restaurant_Review-g297415-d10586417-Reviews-ShanTou_BaHe_LiHai_Ji_Niuroudian_NanHu-Shenzhen_Guangdong.html',
  'sz-036': 'https://www.tripadvisor.com/Restaurant_Review-g297415-d17783957-Reviews-Fanlou-Shenzhen_Guangdong.html',
  'sz-037': 'https://www.tripadvisor.com/Restaurant_Review-g297415-d3481166-Reviews-Jin_Yue_Xuan-Shenzhen_Guangdong.html',
  'sz-038': 'https://www.tripadvisor.com/Restaurant_Review-g297415-d26861742-Reviews-Dian_Du_De_Huanggang_Village_Store-Shenzhen_Guangdong.html',
  // sz-039 Chuxianglou — not found, skip
  'sz-040': 'https://www.tripadvisor.com/Restaurant_Review-g297415-d4692121-Reviews-FengHuang_Lou_Sheng_Ting_Yuan-Shenzhen_Guangdong.html',
  // sz-041 Dimlar — not found, skip
  'sz-042': 'https://www.yulianhouse.com/',
  // sz-043 Xin Dou Ji — not found, skip
  'sz-044': 'https://www.tripadvisor.com/Restaurant_Review-g297415-d3481313-Reviews-ChunMan_Yuan_ShiDai_Plaza-Shenzhen_Guangdong.html',
  'sz-045': 'https://www.tripadvisor.com/Attraction_Review-g297418-d1825210-Reviews-Zhuhai_Lovers_Road-Zhuhai_Guangdong.html',
  'sz-046': 'https://www.tripadvisor.com/Attraction_Review-g297418-d15758060-Reviews-Zhuhai_Opera_House-Zhuhai_Guangdong.html',
  'sz-047': 'https://www.tripadvisor.com/Attraction_Review-g297418-d1843586-Reviews-Tourist_Cableway_of_Zhuhai-Zhuhai_Guangdong.html',
  'sz-048': 'https://en.wikipedia.org/wiki/Jinwan_Arts_Center',

  // Guangzhou
  'gz-001': 'https://www.tripadvisor.com/Attraction_Review-g298555-d2008063-Reviews-Canton_Tower-Guangzhou_Guangdong.html',
  'gz-002': 'https://www.tripadvisor.com/Attraction_Review-g298555-d1843130-Reviews-Pearl_River_Night_Cruise-Guangzhou_Guangdong.html',
  'gz-003': 'https://www.tripadvisor.com/Attraction_Review-g298555-d3478072-Reviews-Huacheng_Square-Guangzhou_Guangdong.html',
  'gz-004': 'https://www.tripadvisor.com/Attraction_Review-g298555-d1870687-Reviews-Guangzhou_Opera_House-Guangzhou_Guangdong.html',
  'gz-005': 'https://www.tripadvisor.com/Attraction_Review-g298555-d553965-Reviews-Sacred_Heart_Cathedral-Guangzhou_Guangdong.html',
  'gz-006': 'https://en.wikipedia.org/wiki/Haixinsha_Island_(Tianhe_District)',
  'gz-007': 'https://www.tripadvisor.com/Attraction_Review-g298555-d311546-Reviews-Chen_Clan_Ancestral_Hall-Guangzhou_Guangdong.html',
  'gz-008': 'https://www.tripadvisor.com/Attraction_Review-g298555-d311560-Reviews-Shamian_Island-Guangzhou_Guangdong.html',
  'gz-009': 'https://www.tripadvisor.com/Attraction_Review-g298555-d1864491-Reviews-Guangdong_Museum-Guangzhou_Guangdong.html',
  'gz-010': 'https://www.tripadvisor.com/Attraction_Review-g298555-d457131-Reviews-Museum_of_the_Western_Han_Dynasty_Mausoleum_of_the_Nanyue_King-Guangzhou_Guangdong.html',
  'gz-011': 'https://www.tripadvisor.com/Attraction_Review-g298555-d15308224-Reviews-Yong_Qing_Fang-Guangzhou_Guangdong.html',
  'gz-012': 'https://www.tripadvisor.com/Attraction_Review-g298555-d311552-Reviews-Temple_of_the_Six_Banyan_Trees_Flower_Pagoda_Liurong_Temple-Guangzhou_Guangdong.html',
  'gz-013': 'https://www.tripadvisor.com/Attraction_Review-g298555-d490438-Reviews-Baiyun_Mountain-Guangzhou_Guangdong.html',
  'gz-014': 'https://www.tripadvisor.com/Attraction_Review-g298555-d9608957-Reviews-Yuexiu_Park-Guangzhou_Guangdong.html',
  'gz-015': 'https://www.tripadvisor.com/Attraction_Review-g298555-d11816459-Reviews-Haizu_Wetland-Guangzhou_Guangdong.html',
  'gz-016': 'https://www.tripadvisor.com/Attraction_Review-g298555-d1843133-Reviews-Lychee_Bay_Scenic_Area-Guangzhou_Guangdong.html',
  'gz-017': 'https://www.tripadvisor.com/Attraction_Review-g298555-d1797543-Reviews-Huolu_Mountain_Forest_Park-Guangzhou_Guangdong.html',
  'gz-018': 'https://www.tripadvisor.com/Attraction_Review-g298555-d547034-Reviews-Beijing_Road_Shopping_District-Guangzhou_Guangdong.html',
  'gz-019': 'https://www.tripadvisor.com/Attraction_Review-g298555-d2109008-Reviews-South_Tea_Market-Guangzhou_Guangdong.html',
  'gz-020': 'https://www.tripadvisor.com/Attraction_Review-g298555-d2051299-Reviews-Hualinsi_Jade_Street-Guangzhou_Guangdong.html',
  'gz-021': 'https://www.tripadvisor.com/Attraction_Review-g298555-d1580063-Reviews-Shangxiajiu_Pedestrian_Street-Guangzhou_Guangdong.html',
  'gz-022': 'https://www.tripadvisor.com/Attraction_Review-g298555-d3247950-Reviews-Taikoo_Hui-Guangzhou_Guangdong.html',
  'gz-023': 'https://www.tripadvisor.com/Attraction_Review-g298555-d33073358-Reviews-Guangzhou_Yuexiu_District_Haizhong_Seafood_Dried_Goods_Trading_Center-Guangzhou_.html',
  'gz-024': 'https://www.tripadvisor.com/Attraction_Review-g298555-d10209074-Reviews-Parc_Central-Guangzhou_Guangdong.html',
  'gz-025': 'https://www.tripadvisor.com/Attraction_Review-g298555-d14058158-Reviews-Guangzhou_K11_Art_Mall-Guangzhou_Guangdong.html',
  'gz-026': 'https://www.tripadvisor.com/Attraction_Review-g298555-d27176920-Reviews-Dongshankou-Guangzhou_Guangdong.html',
  'gz-027': 'https://www.tripadvisor.com/Attraction_Review-g298555-d3361778-Reviews-Grandview_Mall-Guangzhou_Guangdong.html',
  'gz-028': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d4261341-Reviews-Jiang_By_Chef_Fei-Guangzhou_Guangdong.html',
  'gz-029': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d27688175-Reviews-Imperial_Treasure_Fine_Chinese_Cuisine_igc-Guangzhou_Guangdong.html',
  'gz-030': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d8089759-Reviews-Bingsheng_Mansion-Guangzhou_Guangdong.html',
  'gz-031': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d2701034-Reviews-Li_Yuan_Restaurant_YiAn_Plaza-Guangzhou_Guangdong.html',
  'gz-032': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d3503329-Reviews-Hui_Shi_Jia_DongFeng-Guangzhou_Guangdong.html',
  'gz-033': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d23975647-Reviews-Yu_Yue_Heen-Guangzhou_Guangdong.html',
  'gz-034': 'https://www.tripadvisor.com/Hotel_Review-g298555-d302023-Reviews-White_Swan_Hotel-Guangzhou_Guangdong.html',
  'gz-035': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d2177844-Reviews-Guangzhou_Restaurant-Guangzhou_Guangdong.html',
  'gz-036': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d3503931-Reviews-Tao_Tao_Ju_Bing_Jia_Di_Shi_Fu-Guangzhou_Guangdong.html',
  'gz-037': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d1052954-Reviews-PanXi_Restaurant-Guangzhou_Guangdong.html',
  'gz-038': 'https://guide.michelin.com/en/guangdong-province/guangzhou/restaurant/fa-sing-garden-jinsui-road',
  'gz-039': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d6214488-Reviews-Dian_Dou_De_Ju_FuLou-Guangzhou_Guangdong.html',
  'gz-040': 'https://guide.michelin.com/en/guangdong-province/guangzhou/restaurant/e-qian-ya-hou',
  'gz-041': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d3503948-Reviews-Yin_Ji_ChangFen_Dian_Hui_Fu_East_Road-Guangzhou_Guangdong.html',
  'gz-042': 'https://www.tripadvisor.com/Restaurant_Review-g298555-d3504322-Reviews-Nan_Xin_NiuNai_TianPin_ZhuanJia-Guangzhou_Guangdong.html',
  'gz-043': 'https://www.tripadvisor.com/Attraction_Review-g1074274-d457128-Reviews-Kaiping_Diaolou_and_Villages-Kaiping_Guangdong.html',

  // Foshan
  // U5o1cSKHBr5ijyJmnBi3 (Donghua Li) — already Wikipedia, no change
  'fs-001': 'https://www.tripadvisor.com/Attraction_Review-g494927-d1842718-Reviews-The_Ancestral_Temple-Foshan_Guangdong.html',
  'fs-002': 'https://www.tripadvisor.com/Attraction_Review-g494927-d1797473-Reviews-Wong_Fei_Hung_Lion_Dance_Martial_Arts_Museum-Foshan_Guangdong.html',
  'fs-003': 'https://www.tripadvisor.com/Attraction_Review-g494927-d1843418-Reviews-Bruce_Lee_Park-Foshan_Guangdong.html',
  'fs-004': 'https://www.tripadvisor.com/Attraction_Review-g494927-d11670928-Reviews-Foshan_Lingnan_World-Foshan_Guangdong.html',
  'fs-005': 'https://www.tripadvisor.com/Attraction_Review-g494927-d1842712-Reviews-Nanfeng_Ancient_Kiln-Foshan_Guangdong.html',
  'fs-006': 'https://www.tripadvisor.com/Attraction_Review-g494927-d1825209-Reviews-Shunde_Qinghui_Park-Foshan_Guangdong.html',
  'fs-007': 'https://www.tripadvisor.com/Attraction_Review-g297411-d2540180-Reviews-Feng_Jian_Village-Guangdong.html',
  'fs-008': 'https://www.tripadvisor.com/Attraction_Review-g494927-d554640-Reviews-Xiqiao_Mountain_National_Forest_Park-Foshan_Guangdong.html',
  'fs-009': 'https://www.tripadvisor.com/Attraction_Review-g494927-d5115989-Reviews-HuaGai_Lu_BuXingJie-Foshan_Guangdong.html',
};

let updated = 0;
for (const [id, source] of Object.entries(updates)) {
  await db.collection('places').doc(id).update({ 'links.source': source });
  console.log(`✓ ${id}`);
  updated++;
}

console.log(`\nDone. Updated ${updated} places.`);
