const express = require('express');
const app = express();
app.use(express.static("./public"));
const axios = require('axios');
const PORT = process.env.PORT || 5000;
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, } = require('firebase-admin/firestore');
require('dotenv').config();

// キャッシュ用オブジェクト
const cache = {};
// キャッシュの有効期限（ミリ秒）
const CACHE_EXPIRATION = 300000; // 5分

//  サービスアカウントファイル
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// ADMIN SDK初期化
const firebaseApp = admin.initializeApp({
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
        const rawPrice = await price.evaluate(el => el.textContent.trim());
        const pricepattern = /(\d+)円/;
        const priceResult = rawPrice.match(pricepattern);
        //  文字列から整数型に変換
        const itemPrice = parseInt(priceResult[1], 10);
        console.log(`${itemPrice}円`);
        //  商品販売開始日
        const pattern = /（.）以降順次発売/;
        const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
        const launchDate = await data.$('div > div.item_launch > p');
        const rawLaunchDate = await launchDate.evaluate(el => el.textContent.trim());
        const trimedLaunchDate = rawLaunchDate.replace(pattern, "").trim();
        const itemLaunchDate = trimedLaunchDate.replace(datePattern, "$1-$2-$3");
        const date = new Date(itemLaunchDate)
        const region = await data.$('div > div.item_region > p');
        const rawRegion = await region.evaluate(el => el.textContent.trim());
        const itemRegion = rawRegion.replace("販売地域：", "").split("、");

        const query = await db.collection("items").where('name', '==', itemName).get();

        if (query.empty) {
            const itemRef = await db.collection('items').add({
                name: itemName,
                price: itemPrice,
                launch_date: date,
                favorites: 0,
                regions: itemRegion,
            });

            console.log(`商品を追加しました: ${itemRef.id}`);

            // 画像をアップロード
            const fileName = `${itemRef.id}.jpg`;
            const imageUrl = await uploadImageToStorage(itemImage, fileName);

            // Firestoreに画像URLを更新
            await itemRef.update({ item_image: imageUrl });
        } else {
            console.log(`既に登録されています: ${itemName}`);
        }
    }

    await browser.close();
}

// URLからパスを抽出する関数
function extractFilePath(url) {
    try {
        const decodedUrl = decodeURIComponent(url); // URLデコード
        const match = decodedUrl.match(/\/itemImage\/(.+)$/); // 必要な部分を抽出
        return match ? `itemImage/${match[1]}` : null;
    } catch (error) {
        console.error('URL解析に失敗しました:', error);
        return null;
    }
}

// ストレージのファイルを公開する関数
async function makeFilePublic(filePath) {
    const file = bucket.file(filePath);
    await file.makePublic();
    console.log(`File ${filePath} is now public`);
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    console.log(`Public URL:`, publicUrl);
    return publicUrl;
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/v1/item', async (req, res) => {
    const cacheKey = 'items';
    const now = Date.now();

    // キャッシュをチェック
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_EXPIRATION)) {
        console.log('Returning cached data');
        return res.json(cache[cacheKey].data);
    }
    try {
        //  スクレイピング＆データベースに格納
        await getItems();
        //  データベースのデータ取得
        const itemsRef = db.collection('items');
        const snapshot = await itemsRef.get()
        const items = []; // 結果を格納する配列
        for (const doc of snapshot.docs) {
            const id = doc.id;
            const item_name = doc.data().name
            const item_price = doc.data().price
            const timestamp = doc.data().launch_date
            console.log(timestamp)
            const item_image = doc.data().item_image
            const favorites = doc.data().favorites
            const regions = doc.data().regions;
            let formattedDate;
            if (timestamp != undefined) {
                const date = new Date(timestamp._seconds * 1000);
                // 曜日名のリスト
                const days = ["日", "月", "火", "水", "木", "金", "土"];
                // 年、月、日、曜日を取得
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0'); // 0始まりなので+1
                const day = String(date.getDate()).padStart(2, '0'); // 日を2桁にフォーマット
                const weekday = days[date.getDay()]; // 曜日名を取得

                // フォーマットされた日付文字列
                formattedDate = `${year}年${month}月${day}日(${weekday})`;
                console.log(formattedDate)
            }
            else {
                formattedDate = "不明"
            }

            // URLからパスを抽出
            const filePath = extractFilePath(item_image);
            if (!filePath) {
                console.error(`Invalid file path for image: ${item_image}`);
                continue; // 無効な場合はスキップ
            }

            // 画像の公開URLを取得
            const item_image_publicUrl = await makeFilePublic(filePath);
            // データを配列に追加
            items.push({
                id: id,
                name: item_name,
                price: item_price,
                launch: formattedDate,
                imageUrl: item_image,
                favorites: favorites,
                regions: regions,
            });
        };
        // キャッシュに保存
        cache[cacheKey] = {
            timestamp: now,
            data: { message: 'スクレイピングを完了しました', items: items }
        };

        res.json(cache[cacheKey].data);
    } catch (error) {
        console.error(error);
        res.status(500).send('エラーが発生しました');
    }
});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
})
app.listen(PORT, () => { console.log(`http://localhost:${PORT}`) });
