// //  webスクレイピング用モジュールをインスタンス化
// const puppeteer = require('puppeteer');
// require('dotenv').config();

// const admin = require('firebase-admin');
// //  サービスアカウント
// const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// // ADMIN SDK初期化
// const firebaseApp = admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     storageBucket: 'conveni-trend.firebasestorage.app',
// });
// // データベース接続
// const db = admin.firestore();
// //  ストレージ接続
// const bucket = admin.storage().bucket();

// async function getSevenItems() {
    
//     //  セブンイレブンの新商品ページURL
//     const url = "https://www.sej.co.jp/products/a/thisweek/"

//     //  セブンイレブンの各新商品情報の入った要素
//     const element = '.pbNested> div > div.list_inner';
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     await page.goto(url);
//     const datas = await page.$$(element);
    
//     //  スクレピングしたデータをフィルタリングして必要な情報を取得
//     for (const data of datas) {
//         //  商品画像URL
//         const img = await data.$('figure > a > img');
//         const imageUrl = await img.evaluate(el => el.getAttribute('data-original'));

//         //  商品名
//         const name = await data.$('div.item_ttl > p > a');
//         const itemName = await name.evaluate(el => el.textContent.trim());
        
//         //  商品価格
//         const price = await data.$('div > div.item_price > p');
//         const itemPrice = await price.evaluate(el => el.textContent.trim());
        
//         //  商品販売開始日
//         const pattern = /（.）以降順次発売/;
//         const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
//         const launchDate = await data.$('div > div.item_launch > p');
//         const rawLaunchDate= await launchDate.evaluate(el => el.textContent.trim());
//         const trimedLaunchDate = rawLaunchDate.replace(pattern,"").trim();
//         const itemLaunchDate = trimedLaunchDate.replace(datePattern, "$1-$2-$3");
//         console.log(itemLaunchDate);

//         const region = await data.$('div > div.item_region > p');
//         const trimedRegion = await region.evaluate(el => el.textContent.trim());
//         const itemRegion = trimedRegion.replace("販売地域：", "").split("、");

//         //  同じ商品名のデータが既に登録されているか確認するクエリ
//         const query = await db.collection("items").where('item_name', '==', itemName).get();

//         //  同じ商品のデータが登録されていない場合
//         if (query.empty) {
//             //  itemsコレクションにデータを追加
//             const docRef = await db.collection('items').add({
//                 name: itemName,
//                 price: itemPrice,
//                 launch_date: itemLaunchDate,
//             });

//             console.log(`商品を追加しました: ${docRef.id}`);

//             // 画像をアップロード
//             const fileName = `${docRef.id}.jpg`;
//             const imageUrl = await uploadImageToStorage(imageUrl, fileName);

//             // Firestoreに画像URLを更新
//             await itemRef.update({ image_file_name: fileName });
//             const itemsRegionRef = await db.collection('items_region').add({ item_id: itemRef.id });
//             const regionPromises = itemRegion.map(async regionName => {
//                 const regionRef = await db.collection('region').add({
//                     items_region_id: itemsRegionRef.id,
//                     region_name: regionName,
//                 });
//                 return regionRef.id;
//             });
//             const regionIds = await Promise.all(regionPromises);

//             await itemsRegionRef.update({ region_ids: regionIds });
//             console.log("地域情報を更新しました");
//         } else {
//             console.log(`既に登録されています: ${itemName}`);
//         }
//     }
//     await browser.close();
// }
// getSevenItems();