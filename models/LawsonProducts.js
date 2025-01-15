const puppeteer = require('puppeteer')
const axios = require('axios');
const { PassThrough } = require('stream');
const { db, bucket, } = require('../firebaseConfig');
require('dotenv').config();

//  firestoreのコレクション名
const collectionName = 'lawson_products';
//  firestorageのフォルダ名
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
            const taxedPrice = rawPrice.replace(/(各|円|\(税込\))/g, '').trim();
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
            
            
            const mainAllergies = await page.$$eval(    //  主要なアレルギー成分
                "#sec-01 > div.rightBlock > dl > dd.allergy > div > dl > dt",
                elements => elements.map(el => el.textContent.trim())
            ) || []
            let rawOtherallergies;  // その他のアレルギー成分

            //  その他のアレルギー成分の要素が存在するか確認
            const allergyElement = await page.$("#sec-01 > div.rightBlock > dl > dd.allergy > p");
            if (allergyElement) {
                rawOtherallergies = await allergyElement.evaluate(el => el.textContent.trim());
            } else {
                console.log("アレルギー情報が見つかりませんでした。",allergyElement);
            }
            const regex = /「(.+)」/;   //  正規表現
            let found;                  //  正規表現の結果
            let otherAllergies = []; // その他の各アレルギー成分
            // その他のアレルギー成分が存在する場合正規表現で分解
            if (rawOtherallergies) {
                if(rawOtherallergies === "特定原材料8品目は含まれていません"){
                    otherAllergies=rawOtherallergies;
                }
                else{
                    found = rawOtherallergies.match(regex);
                }
            }
            if (found) {
                otherAllergies = found[1].split('・');
            } else {
                console.log("その他のアレルギー情報が見つかりませんでした:", rawOtherallergies);
            }
            console.log("その他の各アレルギー成分",otherAllergies)
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
const getLawsonProducts = async (option, order) => {
    const collectionRef = db.collection(collectionName);
    let query = collectionRef;
    // クエリを実行
    const snapshot = await query.orderBy(option,order).get();
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
                image: data.image,
            };
        })

    return products;
};
const getFavoriteLawsonProducts = async (productIds, option,order) => {
    console.log('getFavoriteLawsonProducts option',option);
    console.log('getFavoriteLawsonProducts order',order);
    let productData = [];
    // 各商品IDについて非同期に処理

    let querySnapshots = await db.collection(collectionName).where('__name__', 'in', productIds)
    .orderBy(option,order).get(); // 指定したIDでフィルタリング
    productData = querySnapshots.docs
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
    console.log(productData)
    return productData;  // 商品データの配列を返す
}


module.exports = {
    lawsonScraper,
    addLawsonProducts,
    getLawsonProducts,
    getFavoriteLawsonProducts
}