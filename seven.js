const express = require('express');
const app = express();
app.use(express.static("./public"));
const axios = require('axios');
const PORT = process.env.PORT || 5000;
// ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const admin = require('firebase-admin');
// const { initializeApp } = require('firebase-admin/app');
// const { getFirestore, } = require('firebase-admin/firestore');
require('dotenv').config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const {firebaseApp, db, bucket} = require('./firebaseConfig');
const {sevenElevenScraper,addSevenElevenProducts, getSevenElevenProducts,} = require('./models/SevenElevenProducts');
const {lawsonScraper,addLawsonProducts, getLawsonProducts,} = require('./models/LawsonProducts');
// console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS)
// //  サービスアカウントファイル
// const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// // ADMIN SDK初期化
// const firebaseApp = initializeApp({
//     credential: applicationDefault(),
//     storageBucket: 'conveni-trend.firebasestorage.app',
// });
// auth
const auth = admin.auth();
// // データベース接続
// const db = admin.firestore();
// //  ストレージバケット接続
// const bucket = admin.storage().bucket();


//  webスクレイピング用モジュールをインスタンス化
const puppeteer = require('puppeteer');
// const { addLawsonProducts } = require('./LawsonProducts');

//  セブンイレブンの各商品情報の要素
const elements = '.pbNested> div > div.list_inner';

async function uploadImageToStorage(imageUrl, fileName) {
    try {
        // URLから画像データを取得
        const response = await axios.get(imageUrl, { responseType: 'stream' });

        // ストレージのアップロード先を設定
        const file = bucket.file(`itemImage/${fileName}`);

        // ストリームで画像をアップロード
        const stream = response.data.pipe(file.createWriteStream({
            metadata: {
                contentType: response.headers['content-type'],
            },
        }));

        // アップロード完了を待つ
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        console.log(`画像をStorageにアップロードしました: ${fileName}`);
        return file.publicUrl(); // 公開URLを返す
    } catch (error) {
        console.error("画像アップロード中にエラーが発生しました:", error);
        throw error;
    }
}

async function addProducts() {
    addSevenElevenProducts();
    addLawsonProducts();
    // const browser = await puppeteer.launch({ headless: false });
    // const page = await browser.newPage();
    // await page.goto('https://www.sej.co.jp/products/a/thisweek/');
    // const datas = await page.$$(elements);
    // for (let i = 0; i < datas.length; i++) {
    //     const currentProducts = await page.$$(elements); 
    //     const data = currentProducts[i];
    //     const img = await data.$('figure > a > img');
    //     const itemImage = await img.evaluate(el => el.getAttribute('data-original'));
    //     const nameElementHandle = await data.$('div.item_ttl > p > a');
    //     const name = await nameElementHandle.evaluate(el => el.textContent.trim());
    //     const price = await data.$('div > div.item_price > p');
    //     const rawPrice = await price.evaluate(el => el.textContent.trim());
    //     const pricepattern = /(\d+)円/;
    //     const priceResult = rawPrice.match(pricepattern);
    //     //  文字列から整数型に変換
    //     const itemPrice = parseInt(priceResult[1], 10);
    //     console.log(`${itemPrice}円`);
    //     //  商品販売開始日
    //     const pattern = /（.）以降順次発売/;
    //     const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
    //     const launchDate = await data.$('div > div.item_launch > p');
    //     const rawLaunchDate = await launchDate.evaluate(el => el.textContent.trim());
    //     const trimedLaunchDate = rawLaunchDate.replace(pattern, "").trim();
    //     const itemLaunchDate = trimedLaunchDate.replace(datePattern, "$1-$2-$3");
    //     const date = new Date(itemLaunchDate)
    //     const region = await data.$('div > div.item_region > p');
    //     const rawRegion = await region.evaluate(el => el.textContent.trim());
    //     const itemRegion = rawRegion.replace("販売地域：", "").split("、");
    //     await Promise.all(
    //         [
    //             page.waitForNavigation(),
    //             data.$eval('figure > a', el => el.click()) // li要素内のaタグをクリック
    //         ]
    //     )
    //     console.log("新商品のページURL", page.url());

    //     const allergiesElementHandle = await page.$('#pbBlock1778459 > div.detail_wrap> div.allergy > table > tbody > tr:nth-child(1) > td > dl > dd');
    //     const rawallergies = await allergiesElementHandle.evaluate(el => el.textContent.trim());
    //     const allergies = rawallergies.split('・').map(item => item.trim());
    //     console.log("この商品のアレルギー",allergies)
    //     // 前のページに戻る
    //     await Promise.all(
    //         [
    //             page.waitForNavigation({ waitUntil: 'load' }),
    //             page.goBack(),
    //         ]
    //     )
    //     console.log("戻ったページ:", page.url())
    //     const query = await db.collection("items").where('name', '==', name).get();

    //     if (query.empty) {
    //         const itemRef = await db.collection('items').add({
    //             name: name,
    //             price: itemPrice,
    //             launch_date: date,
    //             favorites: 0,
    //             regions: itemRegion,
    //         });

    //         console.log(`商品を追加しました: ${itemRef.id}`);

    //         // 画像をアップロード
    //         const fileName = `${itemRef.id}.jpg`;
    //         const imageUrl = await uploadImageToStorage(itemImage, fileName);

    //         // Firestoreに画像URLを更新
    //         await itemRef.update({ item_image: imageUrl });
    //     } else {
    //         console.log(`既に登録されています: ${name}`);
    //     }
    // }

    // await browser.close();
}

// // URLからパスを抽出する関数
// function extractFilePath(url) {
//     try {
//         const decodedUrl = decodeURIComponent(url); // URLデコード
//         const match = decodedUrl.match(/\/itemImage\/(.+)$/); // 必要な部分を抽出
//         return match ? `itemImage/${match[1]}` : null;
//     } catch (error) {
//         console.error('URL解析に失敗しました:', error);
//         return null;
//     }
// }

// // ストレージのファイルを公開する関数
// async function makeFilePublic(filePath) {
//     const file = bucket.file(filePath);
//     await file.makePublic();
//     console.log(`File ${filePath} is now public`);
//     const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
//     console.log(`Public URL:`, publicUrl);
//     return publicUrl;
// }

app.get('/api/v1/favorites', async (req, res) => {
    const { uid } = req.query; // クエリパラメータからuidを取得
    if (uid) {
        console.log(`Received UID: ${uid}`);
        // ここでuidを使って処理を行う
        const favoritesRef = db.collection('favorites');
        const snapshot = await favoritesRef.where('user_id', '==', uid).get();

        // Promise.allを使って非同期で処理する
        const items = await Promise.all(snapshot.docs.map(async (doc) => {
            const favoritesData = doc.data();
            const itemId = favoritesData.item_id;

            // itemsコレクションから商品情報を取得
            const itemRef = db.collection('items').doc(itemId);
            const itemSnapshot = await itemRef.get(); // ここを修正

            if (!itemSnapshot.exists) { // itemSnapshotに変更
                console.log(`Item with ID ${itemId} not found`);
                return null; // アイテムが存在しない場合はnullを返す
            }

            const data = itemSnapshot.data(); // .data() を呼び出して商品データを取得
            const id = itemSnapshot.id
            console.log(id);
            let formattedDate = "不明";

            // launch_dateが存在する場合はフォーマットを変更
            if (data.launch_date) {
                const date = new Date(data.launch_date._seconds * 1000);    // TIMESTAMP型をDate型に変換
                formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
            }

            let imageUrl = data.public_image_url || data.item_image;
            if (!data.public_image_url) {
                const filePath = extractFilePath(data.item_image);
                if (filePath) {
                    imageUrl = await makeFilePublic(filePath);
                    await db.collection('items').doc(id).update({ public_image_url: imageUrl });
                }
            }

            // 商品データを返す
            return {
                id,
                name: data.name,
                price: data.price,
                launch: formattedDate,
                imageUrl,
                favorites: data.favorites,
                regions: data.regions,
            };
        }));

        // nullのアイテムをフィルタリング
        const validItems = items.filter(item => item !== null);

        // items配列をレスポンスとして返す
        res.status(200).send({ message: `Favorites for user ${uid}`, items: validItems });
    } else {
        res.status(400).send({ error: 'UID is required' });
    }
});
app.get('/api/v1/ranking', async (req, res) => {
    try {
        const itemsRef = db.collection('items');
        const snapshot = await itemsRef.orderBy('favorites', 'desc').limit(3).get();
        const items = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const id = doc.id;

            let formattedDate = "不明";
            if (data.launch_date) {
                const date = new Date(data.launch_date._seconds * 1000);    //  TIMESTAMP型をDate型に変換
                formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
            }

            let imageUrl = data.public_image_url || data.item_image;
            if (!data.public_image_url) {
                const filePath = extractFilePath(data.item_image);
                if (filePath) {
                    imageUrl = await makeFilePublic(filePath);
                    await db.collection('items').doc(id).update({ public_image_url: imageUrl });
                }
            }

            return {
                id,
                name: data.name,
                price: data.price,
                launch: formattedDate,
                imageUrl,
                favorites: data.favorites,
                regions: data.regions,
            };
        }));
        return res.json({ message: 'データ取得成功', items });
    } catch (error) {
        console.log(error);
        res.status(500).send("エラーが発生しました");
    }
})
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/api/v1/scraping', async (req, res) => {
    addProducts();
    res.send("スクレイピングを完了しました")
})
app.get('/api/v1/item', async (req, res) => {
    const products = await getSevenElevenProducts();
    return res.json({ message: 'データ取得成功', products });
    // try {
    //     const itemsRef = db.collection('items');
    //     const snapshot = await itemsRef.orderBy('launch_date', 'desc').get();

    //     const products = await Promise.all(snapshot.docs.map(async (doc) => {
    //         const data = doc.data();
    //         const id = doc.id;

    //         let formattedDate = "不明";
    //         if (data.launch_date) {
    //             const date = new Date(data.launch_date._seconds * 1000);    //  TIMESTAMP型をDate型に変換
    //             formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
    //         }

    //         let imageUrl = data.public_image_url || data.item_image;
    //         if (!data.public_image_url) {
    //             const filePath = extractFilePath(data.item_image);
    //             if (filePath) {
    //                 imageUrl = await makeFilePublic(filePath);
    //                 await db.collection('items').doc(id).update({ public_image_url: imageUrl });
    //             }
    //         }

    //         return {
    //             id,
    //             name: data.name,
    //             price: data.price,
    //             launch: formattedDate,
    //             imageUrl,
    //             favorites: data.favorites,
    //             regions: data.regions,
    //         };
    //     }));
    //     return res.json({ message: 'データ取得成功', products });
    // } catch (error) {
    //     console.error(error);
    //     res.status(500).send('エラーが発生しました');
    // }
});

app.get('api/v1/lawson/home',(req,res)=>{

})
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
})

app.listen(PORT, () => { console.log(`http://localhost:${PORT}`) });
