const express = require('express');
const app = express();
app.use(express.static("./public"));
const axios = require('axios');
const PORT = process.env.PORT || 5000;
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, } = require('firebase-admin/firestore');
require('dotenv').config();

//  サービスアカウントファイル
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// ADMIN SDK初期化
const firebaseApp =admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'conveni-trend.firebasestorage.app',
});
// データベース接続
const db = admin.firestore();
//  ストレージバケット接続
const bucket = admin.storage().bucket();

//  webスクレイピング用モジュールをインスタンス化
const puppeteer = require('puppeteer')

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

async function getItems() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.sej.co.jp/products/a/thisweek/');

    const datas = await page.$$(elements);

    for (const data of datas) {
        const img = await data.$('figure > a > img');
        const itemImage = await img.evaluate(el => el.getAttribute('data-original'));
        const name = await data.$('div.item_ttl > p > a');
        const itemName = await name.evaluate(el => el.textContent.trim());
        const price = await data.$('div > div.item_price > p');
        const itemPrice = await price.evaluate(el => el.textContent.trim());
        const launch = await data.$('div > div.item_launch > p');
        const itemLaunch = await launch.evaluate(el => el.textContent.trim());
        const region = await data.$('div > div.item_region > p');
        const rawRegion = await region.evaluate(el => el.textContent.trim());
        const itemRegion = rawRegion.replace("販売地域：", "").split("、");

        const query = await db.collection("items").where('item_name', '==', itemName).get();

        if (query.empty) {
            const itemRef = await db.collection('items').add({
                item_name: itemName,
                item_price: itemPrice,
                item_launch: itemLaunch,
            });

            console.log(`商品を追加しました: ${itemRef.id}`);

            // 画像をアップロード
            const fileName = `${itemRef.id}.jpg`;
            const imageUrl = await uploadImageToStorage(itemImage, fileName);

            // Firestoreに画像URLを更新
            await itemRef.update({ item_image: imageUrl });

            const itemsRegionRef = await db.collection('items_region').add({ item_id: itemRef.id });
            const regionPromises = itemRegion.map(async regionName => {
                const regionRef = await db.collection('region').add({
                    items_region_id: itemsRegionRef.id,
                    region_name: regionName,
                });
                return regionRef.id;
            });
            const regionIds = await Promise.all(regionPromises);

            await itemsRegionRef.update({ region_ids: regionIds });
            console.log("地域情報を更新しました");
        } else {
            console.log(`既に登録されています: ${itemName}`);
        }
    }

    await browser.close();
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/v1/item', async (req, res) => {
    try {
        await getItems();
        res.send('スクレイピングを完了しました');
    } catch (error) {
        console.error(error);
        res.status(500).send('エラーが発生しました');
    }
});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
})

app.get('/api/v1/item', (req, res) => {
    getItems();
    res.send('スクレイピングを完了しました');
})

app.listen(PORT, () => { console.log(`http://localhost:${PORT}`) });
