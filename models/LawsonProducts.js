const puppeteer = require('puppeteer')
const axios = require('axios');
const { PassThrough } = require('stream');
// const { initializeApp, applicationDefault } = require('firebase-admin/app');
// const { getFirestore, } = require('firebase-admin/firestore');
const { db, bucket, } = require('../firebaseConfig');
const { Storage } = require('firebase-admin/storage')
require('dotenv').config();

// const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// //  firebase初期化
// const app = initializeApp({
//     credential: applicationDefault(),
//     storageBucket: 'conveni-trend.firebasestorage.app',
// });
// const db = getFirestore();
const collectionName = 'lawson_products';
// const storage = new Storage(app)
// const bucket = storage.bucket();
const storageFolderName = 'lawson_image'

//  新商品の要素
const element = "#sec-01 > ul.col-3.heightLineParent > li"
//  ホームページURL
const homePage = "https://www.lawson.co.jp/recommend/index.html"

const lawsonScraper = async () => {
    //  テスト時はheadless:falseで実行
    const browser = await puppeteer.launch({ headless: true })
    //  新商品配列
    const newProducts = [];
    try {
        const page = await browser.newPage()
        await page.goto(homePage);
        console.log("ホームページ:", page.url());
        await Promise.all(
            [
                page.waitForNavigation({ waitUntil: 'load' }),
                page.click('#sec-02 > ul > li:nth-child(1) > p.img > a'),

            ]
        )
        console.log("新商品ページ:", page.url())
        await page.waitForSelector(element)
        const datas = await page.$$(element)
        for (let i = 0; i < datas.length; i++) {
            const currentProducts = await page.$$(element); // ここで再度取得
            const data = currentProducts[i]; // 現在のループ用のデータ

            const nameElementHandle = await data.$('p.ttl');
            const name = await nameElementHandle.evaluate(el => el.textContent.trim());
            //  商品名
            console.log("商品名:", name);

            const imgElementHandle = await data.$(`p.img > a > img`)
            const imgSrc = await imgElementHandle.evaluate(el => el.getAttribute('src'))
            console.log("画像相対パス:", imgSrc)
            const image = new URL(imgSrc, homePage).href // フルURLを作成
            //  商品画像
            console.log("画像絶対パス:", image)

            const dateElementHandle = await data.$('p.date > span');
            const rawDate = await dateElementHandle.evaluate(el => el.textContent.trim());
            const date = new Date(rawDate)
            //  販売開始日
            console.log("販売開始日", date);

            const priceElementHandle = await data.$('p.price > span:nth-child(1)');
            const rawPrice = await priceElementHandle.evaluate(el => el.textContent.trim());
            const taxedPrice = rawPrice.replace('円', '').trim();
            //  商品価格
            const price = parseInt(taxedPrice, 10);
            console.log(price, "円(税込み)");

            // リンクをクリック
            await Promise.all(
                [
                    page.waitForNavigation(),
                    data.$eval('a', el => el.click()) // li要素内のaタグをクリック
                ]
            )
            console.log("商品詳細ページ:", page.url());
            const mainAllergies = await page.$$eval(
                "#sec-01 > div.rightBlock > dl > dd.allergy > div > dl > dt",
                elements => elements.map(el => el.textContent.trim())
            )
            const rawOtherallergies = await page.$eval(
                "#sec-01 > div.rightBlock > dl > dd.allergy > p",
                elements => elements.textContent.trim()
            )
            const regex = /「(.+)」/;
            const found = rawOtherallergies.match(regex);
            const otherAllergies = found[1].split('・')
            const allergies = mainAllergies.concat(otherAllergies);
            console.log("アレルギー成分:", allergies);
            // 前のページに戻る
            await Promise.all(
                [
                    page.waitForNavigation({ waitUntil: 'load' }),
                    page.goBack(),
                ]
            )
            newProducts.push({
                name: name,
                image: image,
                date: date,
                price: price,
                allergies: allergies,
            })
            console.log("戻ったページ:", page.url())
        }
        return newProducts
    } catch (error) {
        console.log(error)
    } finally {
        await browser.close()
    }
}

const addLawsonProducts = async () => {
    const datas = await lawsonScraper();
    datas.map(async (data) => {
        const name = data.name;
        const query = await db.collection(collectionName).where('name', '==', name).get();
        if (query.empty) {
            const productRef = await db.collection(collectionName).add({
                name: name,                 //  商品名
                price: data.price,          //  販売価格
                date: data.date,             //  販売開始日
                allergies: data.allergies,   //  アレルギー情報
                favorites: 0,               //  お気に入り登録数
            })
            console.log(productRef.id, "をデータベースに登録しました")

            const fileName = `${storageFolderName}/${productRef.id}.jpg`;
            try {
                // 画像データを取得
                const response = await axios({
                    url: data.image,
                    method: 'GET',
                    responseType: 'stream',
                });
                // Cloud Storage に直接ストリームをパイプ
                const file = bucket.file(fileName);
                const passThroughStream = new PassThrough();
                response.data.pipe(passThroughStream);
                await new Promise((resolve, reject) => {
                    passThroughStream
                        .pipe(file.createWriteStream())
                        .on('finish', resolve)
                        .on('error', reject);
                });
                // アップロード完了後にファイルを公開
                await file.makePublic();
                console.log(`${fileName} を Cloud Storage にアップロードし、公開しました`);
                // 公開 URL を取得
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                console.log("公開 URL:", publicUrl);
                // 商品画像URLを公開URLで上書き
                await db.collection(collectionName).doc(productRef.id).update({
                    image: publicUrl,
                });
            } catch (error) {
                console.error("画像アップロード中にエラーが発生しました:", error);
            }
        }
        else {
            console.log(name, "はすでに登録されています")
        }
    })
}
addLawsonProducts()

const getLawsonProducts = async (option, order, allergies) => {
    const collectionRef = db.collection(collectionName);
    let query = collectionRef;

    // 新着商品順
    if (option === "new") {
        query = query.orderBy('date', 'desc');
    } else if (option === "price") {
        if (order === "high") {
            query = query.orderBy('price', 'desc');
        } else {
            query = query.orderBy('price', 'asc');
        }
    }
    // クエリを実行
    const snapshot = await query.get();
    const products = snapshot.docs
        .map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name:data.name,
                date: data.date.toDate(),
                price: data.price,
                favorites: data.favorites,
                allergies: data.allergies,
                image: data.image,
            };
        })

    return products;
};

module.exports = {
    lawsonScraper,
    addLawsonProducts,
    getLawsonProducts
}