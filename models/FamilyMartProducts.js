const puppeteer = require('puppeteer')
const axios = require('axios');
const { db, bucket, } = require('../firebaseConfig');
require('dotenv').config();
//  firestoreのコレクション名
const collectionName = 'familymart_products';
//  firestorageのフォルダ名
const storageFolderName = 'familymart_image'
//  新商品の要素
const element = '#new_layout-3clm > div'
//  ホームページURL
const homePage = "https://www.family.co.jp/goods/newgoods.html"

const familyMartScraper = async () => {
    //  テスト時はheadless:falseで実行
    const browser = await puppeteer.launch({ headless: true });
    //  新商品配列
    const newProducts = [];
    try {
        const page = await browser.newPage();
        await page.goto(homePage);
        const datas = await page.$$(element);
        for (let i = 0; i < datas.length; i++) {
            const currentProducts = await page.$$(element); // 要素を再度取得
            const data = currentProducts[i];                // 現在のループの商品

            //  商品名
            const nameElementHandle = await data.$('div > a > h3');
            let name = await nameElementHandle.evaluate(el => el.textContent.trim());
            if (name.includes('【世界の山ちゃん®監修】')) {
                name = name.replace(/[【】®]/g, '').replace('監修', '監修　');
            }
            // console.log("商品名:", name);

            const categoryElementHandle = await data.$('div > a > p.ly-mod-infoset3-cate');
            const category = await categoryElementHandle.evaluate(el => el.textContent.trim());
            console.log('商品カテゴリー:' + category);
            //  商品価格
            const priceElementHandle = await data.$('div > a > p.ly-mod-infoset3-txt');
            const rawPrice = await priceElementHandle.evaluate(el => el.textContent.trim());
            const priceRegex = /\d+(?:,\d+)?円（税込(?:([\d,]+)円)?\）/;
            const priceFound = rawPrice.match(priceRegex);
            const price = parseInt(priceFound[1].replace(/,/g, ''), 10); //  カンマを含む場合(販売価格が4桁以上)は空文字で型変換
            // console.log('販売価格：'+price+'円(税込み)')

            //  販売地域
            const regionElementHandle = await data.$('div > p:nth-child(2)');
            const rawRegion = await regionElementHandle.evaluate(el => el.textContent.trim());
            const rawRegions = rawRegion.replace("発売地域：", "").split("、");
            // 地域変換マップ
            const regionMap = {
                "関西": ["近畿"],
                "中国・四国": ["中国", "四国"]
            };

            // 地域を変換・分割
            const regions = rawRegions.flatMap(region => regionMap[region] || [region]);
            // console.log(regions);
            // リンクをクリック
            await Promise.all(
                [
                    page.waitForNavigation(),
                    data.$eval('div > a', el => el.click()) // li要素内のaタグをクリック
                ]
            )
            console.log("商品詳細ページ:", page.url());

            //  販売開始日
            const dateElementHandle = await page.$('#contents > div > div.goods_detail.goods_detail_module.parbase > div > div.ly-mod-layout-2clm > div:nth-child(2) > div.ly-goodsinfo-area > ul.ly-goods-spec > li');
            const rawDate = await dateElementHandle.evaluate(el => el.textContent.trim());
            let trimedDate = rawDate.replace('発売日：', '').trim();
            console.log(trimedDate)
            // 曜日以降を削除する正規表現
            trimedDate = trimedDate.replace(/[\(（].*?[\)）].*$/, '').trim();
            // フォーマットを ISO 8601 に変換 ('2025-01-07')
            const formattedDate = trimedDate
                .replace('年', '-')
                .replace('月', '-')
                .replace('日', '');
            const date = new Date(formattedDate);
            // console.log('販売開始日：', date);
            let allergies = [];  //  アレルギ―情報
            const allergyPage = await page.$('#contents > div > div.goods_detail.goods_detail_module.parbase > div > div.ly-mod-layout-2clm > div:nth-child(2) > div.ly-goodsinfo-area > p:nth-child(8) > a');
            if (allergyPage) {
                // アレルギ―ページをクリック
                await Promise.all(
                    [
                        page.waitForNavigation(),
                        page.$eval('#contents > div > div.goods_detail.goods_detail_module.parbase > div > div.ly-mod-layout-2clm > div:nth-child(2) > div.ly-goodsinfo-area > p:nth-child(8) > a', el => el.click()) // li要素内のaタグをクリック
                    ]
                )
                console.log("アレルギ―詳細ページ:", page.url());
                const products = await page.$$('#agn > div > section > ul > li');
                allergyLoop: for (const product of products) {
                    // 商品名を取得
                    const nameElementHandle = await product.$('div.item_basic_info > p > a'); // 商品名の要素
                    if (nameElementHandle) {
                        const productName = await nameElementHandle.evaluate(el => el.textContent.trim());
                        //  商品名と取得した商品名が一致するか
                        if (productName.includes(name)) {
                            // アレルギー情報を取得
                            const allergiesHandle = await product.$('table.item_allergen > tbody > tr:nth-child(2) > td > ul'); // アレルギー情報が記載されている要素指定
                            if (allergiesHandle) {
                                allergies = await allergiesHandle.$$eval('li > img', lis => lis.map(li => li.getAttribute('alt')).filter(Boolean))// alt 属性が存在しない場合を除外
                                // console.log('アレルギー情報：', allergies);
                                break allergyLoop;  //  アレルギ―情報を探すループを抜ける
                            } else {
                                console.log('アレルギー情報が見つかりませんでした');
                            }
                        }
                        else {
                            console.log('その商品名は含まれていません')
                        }
                    }
                    else {
                        console.log('商品名取得に失敗しました')
                    }
                }
                await Promise.all(
                    [
                        page.waitForNavigation({ waitUntil: 'load' }),
                        page.goBack(),
                    ]
                )
                console.log("商品詳細ページ:", page.url());
            }
            // 新商品ページに戻る
            await Promise.all(
                [
                    page.waitForNavigation({ waitUntil: 'load' }),
                    page.goBack(),
                ]
            )
            newProducts.push({
                name: name,
                category: category,
                date: date,
                price: price,
                allergies: allergies,
                regions: regions,
            })
            // console.log("商品名:", name);
            // console.log("販売価格:", price + "円（税込み)");
            // console.log("販売開始日:", date);
            // console.log("販売地域:", regions);
            // console.log('アレルギー情報：', allergies);
        }
        return newProducts;
    } catch (error) {
        console.log(error);
    }
    finally {
        await browser.close();
    }
}

const categories = {
    'おむすび': 'omusubi.png',
    'お弁当': 'obento.png',
    'お寿司': 'osushi.png',
    'サンドイッチ・ロールパン・バーガー': 'sandwich.png',
    'パン': 'bread.png',
    'そば・うどん・中華めん': 'noodle.png',
    'パスタ': 'pasta.png',
    'サラダ': 'salad.png',
    'チルド惣菜': 'sidedishes.png',
    'スープ・グラタン・ドリア・お好み焼き': 'deli.png',
    '日配品 加工肉 たまご カット野菜 漬物など': 'chilleddaily.png',
    'ホットスナック・惣菜': 'friedfoods.png',
    '中華まん': 'chukaman.png',
    'おでん': 'oden.png',
    'デザート': 'dessert.png',
    '焼き菓子・和菓子': 'baked_sweets.png',
    'コーヒー・フラッペ': 'cafe.png',
    '加工食品': 'processed_foods.png',
    'お菓子': 'snack.png',
    '飲料': 'drink.png',
    'お酒': 'alcohol.png',
    '冷凍食品': 'frozen_foods.png',
    '雑誌・書籍': 'books.png',
    'キャラクターくじ・キャラクター雑貨・カードゲーム': 'charakuji.png',
    'スキンケア・コスメ': 'cosmetics.jpg',
    '【予約受付中】ファミペイWEB予約・ギフトネット': 'disc.png',
}
const addFamilyMartProducts = async () => {
    const datas = await familyMartScraper();
    console.log(datas);
    for (const data of datas) {
        const name = data.name;
        const collectionRef = db.collection(collectionName);
        const query = await collectionRef.where('name', '==', name).get();
        if (query.empty) {
            const category = categories[data.category];
            const fileName = `${storageFolderName}/${category}`;
            const file = bucket.file(fileName);
            try {
                await file.makePublic()
                console.log(`${fileName}を公開しました`)
                const image = `https://storage.googleapis.com/${bucket.name}/${fileName}`
                const productRef = await db.collection(collectionName).add({
                    name: name,                 //  商品名
                    category:data.category,     //  商品カテゴリー
                    price: data.price,          //  販売価格
                    date: data.date,             //  販売開始日
                    allergies: data.allergies,   //  アレルギー情報
                    regions: data.regions,      //  販売地域
                    image:image,                //  画像URL
                    favorites: 0,               //  お気に入り登録数
                })
                console.log(productRef.id, "をデータベースに登録しました")
            } catch (error) {
                console.log(error);
            }
        }
        else{
            console.log(name, "はすでに登録されています");
        }
    }
}
const getFamilyMartProducts = async(region,option,order)=>{
        const collectionRef = db.collection(collectionName);
        const regions = 'regions';  //  販売地域フィールド名
        let query = collectionRef;
        console.log('getFamilyMartProducts option',option);
        console.log('getFamilyMartProducts order',order);
    
        //  ユーザーの住まいの地域に該当する商品を取得
        const snapshot = await query.where(regions,"array-contains-any",["全国", region]).orderBy(option,order).get();
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
                    category:data.category,
                    date: formattedDate,
                    price: data.price,
                    favorites: data.favorites,
                    allergies: data.allergies,
                    regions: data.regions,
                    image: data.image,
                };
            })
        return products;
}
const getFavoriteFamilyMartProducts = async(productIds,option,order)=>{
    console.log('getFavoriteFamilyMartProducts option',option);
    console.log('getFavoriteFamilyMartProducts order',order);
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
                category:data.category,
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

module.exports={
    addFamilyMartProducts,
    familyMartScraper,
    getFamilyMartProducts,
    getFavoriteFamilyMartProducts,
}