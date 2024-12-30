const { PassThrough } = require('stream');
const puppeteer = require('puppeteer')
const axios = require('axios');
const { db, bucket, } = require('../firebaseConfig');
const collectionName = 'sevenEleven_products';
const storageFolderName = 'sevenEleven_image'

//  新商品の要素
const elements = '.pbNested> div > div.list_inner'
// 新商品ページURL
const newProductPage = 'https://www.sej.co.jp/products/a/thisweek/'

const sevenElevenScraper = async () => {
    //  テスト時はheadless:falseで実行
    const browser = await puppeteer.launch({ headless: true });
    //  新商品配列
    const newProducts = [];
    try {
        const page = await browser.newPage();
        await page.goto(newProductPage);
        const datas = await page.$$(elements);
        for (let i = 0; i < datas.length; i++) {
            const currentProducts = await page.$$(elements);
            const data = currentProducts[i];

            //  商品画像
            const imgElementHandle = await data.$('figure > a > img');
            const image = await imgElementHandle.evaluate(el => el.getAttribute('data-original'));

            //  商品名
            const nameElementHandle = await data.$('div.item_ttl > p > a');
            const name = await nameElementHandle.evaluate(el => el.textContent.trim());

            //  販売価格(税込み)
            const priceElementHandle = await data.$('div > div.item_price > p');
            const rawPrice = await priceElementHandle.evaluate(el => el.textContent.trim());
            //  文字列から整数型に変換
            const priceRegex = /(\d+)円/;
            const priceFound = rawPrice.match(priceRegex);
            const taxedPrice = parseInt(priceFound[1], 10) * 1.08;
            const price = Math.round(taxedPrice);


            //  販売開始日
            const trimRegex = /（.）以降順次発売/;
            const dateregex = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
            const dateElementHandle = await data.$('div > div.item_launch > p');
            const rawDate = await dateElementHandle.evaluate(el => el.textContent.trim());
            const trimedDate = rawDate.replace(trimRegex, "").trim();
            const replacedDate = trimedDate.replace(dateregex, "$1-$2-$3");
            const date = new Date(replacedDate)

            //  販売地域
            const regionElementHandle = await data.$('div > div.item_region > p');
            const rawRegion = await regionElementHandle.evaluate(el => el.textContent.trim());
            const regions = rawRegion.replace("販売地域：", "").split("、");
            await Promise.all(
                [
                    page.waitForNavigation(),
                    data.$eval('figure > a', el => el.click()) // li要素内のaタグをクリック
                ]
            )
            // console.log("新商品のページURL", page.url());

            const allergiesElementHandle = await page.$('#pbBlock1778459 > div.detail_wrap> div.allergy > table > tbody > tr:nth-child(1) > td > dl > dd');
            const rawallergies = await allergiesElementHandle.evaluate(el => el.textContent.trim());
            const allergies = rawallergies.split('・').map(item => item.trim());
            // console.log("この商品のアレルギー", allergies)
            // 前のページに戻る
            await Promise.all(
                [
                    page.waitForNavigation({ waitUntil: 'load' }),
                    page.goBack(),
                ]
            )
            newProducts.push({
                name: name,          //  商品名
                image: image,        //  商品画像
                date: date,          //  販売開始日
                price: price,        //  販売価格
                regions: regions,     //  販売地域
                allergies: allergies,//  アレルギー
            })
            console.log("戻ったページ:", page.url())
            console.log("商品名:", name);
            console.log("商品画像:", image);
            console.log("販売価格:", price + "円（税込み)");
            console.log("販売開始日:", date);
            console.log("販売地域:", regions);
        }
        return newProducts
    } catch (error) {
        console.log(error);
    }
    finally {
        await browser.close();
    }
}

const addSevenElevenProducts = async () => {
    const datas = await sevenElevenScraper();
    for (const data of datas) {
        const name = data.name;
        const collectionRef = db.collection(collectionName);
        const query = await collectionRef.where('name', '==', name).get();
        if (query.empty) {
            const productRef = await db.collection(collectionName).add({
                name: name,                 //  商品名
                price: data.price,          //  販売価格
                date: data.date,             //  販売開始日
                allergies: data.allergies,   //  アレルギー情報
                regions: data.regions,      //  販売地域
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
    }
}
const getSevenElevenProducts = async (option, order, allergies) => {
    const collectionRef = db.collection(collectionName);
    let query = collectionRef;

    // 新着商品順
    if (option === "new") {
        query = query.orderBy('date', 'desc');
    } else if (option === "price") {
        if (order === "high") {
            query = query.orderBy('price', 'desc');
        } else if (order === "low") {
            query = query.orderBy('price', 'asc');
        }
    }
    // クエリを実行
    const snapshot = await query.get();
    const products = snapshot.docs
        .map((doc) => {
            const data = doc.data();
            if (data.date) {
                const date = new Date(data.date._seconds * 1000);    //  TIMESTAMP型をDate型に変換
                formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
            }
            return {
                id: doc.id,
                name: data.name,
                date: formattedDate,
                price: data.price,
                favorites: data.favorites,
                allergies: data.allergies,
                regions: data.regions,
                image: data.image,
            };
        })

    return products;
};

module.exports = {
    sevenElevenScraper,
    addSevenElevenProducts,
    getSevenElevenProducts,
}
