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
const { firebaseApp, db, bucket } = require('./firebaseConfig');
const { sevenElevenScraper, addSevenElevenProducts, getSevenElevenProducts, getFavoriteSevenElevenProducts } = require('./models/SevenElevenProducts');
const { lawsonScraper, addLawsonProducts, getLawsonProducts, getFavoriteLawsonProducts } = require('./models/LawsonProducts');
const auth = admin.auth();
const puppeteer = require('puppeteer');
const { FieldValue } = require('firebase-admin/firestore');

const sevenElevenProducts = "sevenEleven_products"      //  セブンイレブン商品コレクション名
const sevenElevenFavorites = "sevenEleven_favorites";   //  セブンイレブンお気に入りコレクション名
const lawsonProducts = "lawson_products"                 //  ローソン商品コレクション名
const lawsonFavorites = "lawson_favorites";             //  ローソンお気に入りコレクション名


// //  セブンイレブンの各商品情報の要素
// const elements = '.pbNested> div > div.list_inner';

//  利用コンビニ名を取得する関数
const getConveni = async (uid) => {
    const userRef = await db.collection('users').doc(uid).get();
    const userData = userRef.data();
    const conveni = userData.conveni;
    console.log("getConveni", conveni)
    return conveni;
}

//  利用コンビニ名に応じて商品コレクション名を返す関数
const getCollection = (conveni) => {
    switch (conveni) {
        case "セブンイレブン":
            return sevenElevenProducts   //  セブンイレブンの商品コレクション名
        case "ローソン":
            return lawsonProducts  //  ローソンの商品コレクション名
    }
}

//  商品コレクション名に応じてお気に入りコレクション名を返す
const getFavoritesFromProducts = (products) => {
    switch (products) {
        case sevenElevenProducts:
            return sevenElevenFavorites   //  セブンイレブンの商品コレクション名
        case lawsonProducts:
            return lawsonFavorites  //  ローソンの商品コレクション名
    }
}

//  利用コンビニ名に応じてお気に入りコレクション名を返す
const getFavoritesFromConveni = (conveni) => {
    switch (conveni) {
        case "セブンイレブン":
            return sevenElevenFavorites   //  セブンイレブンの商品コレクション名
        case "ローソン":
            return lawsonFavorites  //  ローソンの商品コレクション名
    }
}
//  ユーザIDから住まいの地域名を取得
const getRegion = async(uid)=>{
    const userRef = await db.collection('users').doc(uid).get();
    const userData = userRef.data();
    const region = userData.region;
    console.log("getRegion", region)
    return region;
}
//  ユーザIDから住まいの県名取得
const getPrefecture = async(uid)=>{
    const userRef = await db.collection('users').doc(uid).get();
    const userData = userRef.data();
    const prefecture = userData.prefecture;
    console.log("getRegion", prefecture)
    return prefecture;
}
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


// お気に入り表示
app.get('/api/v1/favorites', async (req, res) => {
    const { uid } = req.query;                               //  ユーザID
    const conveni = await getConveni(uid);                  //  利用コンビニ名
    const products = getCollection(conveni);                //  商品コレクション名
    const favorites = getFavoritesFromProducts(products);   //  お気に入りコレクション名
    //  ユーザがお気に入りした商品IDを取得
    querySnapshots = await db.collection(favorites).where('user_id', '==', uid).get();
    //  お気に入り商品が存在しない場合
    if (querySnapshots.empty) {
        console.log("お気に入り商品が見つかりません");
        res.status(200).json([]); // 空配列を返す
        return;
    }
    const productIds = querySnapshots.docs.map(snapshot => snapshot.data().product_id); //  お気に入りした商品ID
    console.log("商品IDの配列", productIds)
    let productData;   //  表示する商品データ
    switch (products) {
        case sevenElevenProducts:
            productData = await getFavoriteSevenElevenProducts(productIds)
            break;
        case lawsonProducts:
            productData = await getFavoriteLawsonProducts(productIds)
            break;
    }
    return res.json({ message: 'データ取得成功', productData, productIds, conveni });
    //  流れ
    //  該当の商品コレクションのmodelsに商品IDの配列を渡す
    //  商品IDを受け取ったmodelsは該当商品IDのドキュメントを取得
    //  データを視覚的に分かりやすいよう成形し、seven.jsに返す
    //  返されたデータをフロントに返す
})


// app.get('/api/v1/favorites', async (req, res) => {
//     const { uid } = req.query; // クエリパラメータからuidを取得

//     if (uid) {
//         console.log(`Received UID: ${uid}`);
//         // ここでuidを使って処理を行う
//         const favoritesRef = db.collection('favorites');
//         const snapshot = await favoritesRef.where('user_id', '==', uid).get();

//         // Promise.allを使って非同期で処理する
//         const items = await Promise.all(snapshot.docs.map(async (doc) => {
//             const favoritesData = doc.data();
//             const itemId = favoritesData.item_id;

//             // itemsコレクションから商品情報を取得
//             const itemRef = db.collection('items').doc(itemId);
//             const itemSnapshot = await itemRef.get(); // ここを修正

//             if (!itemSnapshot.exists) { // itemSnapshotに変更
//                 console.log(`Item with ID ${itemId} not found`);
//                 return null; // アイテムが存在しない場合はnullを返す
//             }

//             const data = itemSnapshot.data(); // .data() を呼び出して商品データを取得
//             const id = itemSnapshot.id
//             console.log(id);
//             let formattedDate = "不明";

//             // launch_dateが存在する場合はフォーマットを変更
//             if (data.launch_date) {
//                 const date = new Date(data.launch_date._seconds * 1000);    // TIMESTAMP型をDate型に変換
//                 formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
//             }

//             let imageUrl = data.public_image_url || data.item_image;
//             if (!data.public_image_url) {
//                 const filePath = extractFilePath(data.item_image);
//                 if (filePath) {
//                     imageUrl = await makeFilePublic(filePath);
//                     await db.collection('items').doc(id).update({ public_image_url: imageUrl });
//                 }
//             }

//             // 商品データを返す
//             return {
//                 id,
//                 name: data.name,
//                 price: data.price,
//                 launch: formattedDate,
//                 imageUrl,
//                 favorites: data.favorites,
//                 regions: data.regions,
//             };
//         }));

//         // nullのアイテムをフィルタリング
//         const validItems = items.filter(item => item !== null);

//         // items配列をレスポンスとして返す
//         res.status(200).send({ message: `Favorites for user ${uid}`, items: validItems });
//     } else {
//         res.status(400).send({ error: 'UID is required' });
//     }
// });
app.get('/api/v1/ranking', async (req, res) => {
    const { uid } = req.query;
    console.log("/api/v1/ranking uid",uid);
    const conveni = await getConveni(uid);
    console.log("/api/v1/ranking conveni",conveni)
    const products = getCollection(conveni);
    console.log("/api/v1/ranking products ",products)
    const favorites = getFavoritesFromProducts(products);
    console.log("/api/v1/ranking お気に入りコレクション名",favorites);
    //  ユーザがお気に入りした商品IDを取得
    FavoriteQuerySnapshot = await db.collection(favorites).where('user_id', '==', uid).get();
    //  お気に入り商品が存在しない場合
    if (FavoriteQuerySnapshot.empty) {
        console.log("お気に入り商品が見つかりません");
        res.status(200).json([]); // 空配列を返す
        return;
    }
    const productIds =  FavoriteQuerySnapshot.docs.map(snapshot => snapshot.data().product_id); //  お気に入りした商品ID
    let productDatas=[];   //  ランキング商品
    try {
        const ProductQuerySnapshot = await db.collection(products).orderBy('favorites', 'desc').limit(3).get();
        ProductQuerySnapshot.docs.map(async (ProductDocSnapshot) => {
            const data = ProductDocSnapshot.data();
            if (data.date) {
                const date = new Date(data.date._seconds * 1000);    //  TIMESTAMP型をDate型に変換
                formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
            }
            // 商品データを配列に追加
            productDatas.push({
                id: ProductDocSnapshot.id,
                name: data.name,
                date: formattedDate,
                price: data.price,
                favorites: data.favorites,
                allergies: data.allergies,
                regions: data.regions,
                image: data.image,
            });

        })
    } catch (error) {
        console.log(error)
    }
    return res.json({ message: 'データ取得成功', productDatas, productIds, conveni });
})
//  ランキング表示
// app.get('/api/v1/ranking', async (req, res) => {
//     try {
//         const itemsRef = db.collection('items');
//         const snapshot = await itemsRef.orderBy('favorites', 'desc').limit(3).get();
//         const items = await Promise.all(snapshot.docs.map(async (doc) => {
//             const data = doc.data();
//             const id = doc.id;

//             let formattedDate = "不明";
//             if (data.launch_date) {
//                 const date = new Date(data.launch_date._seconds * 1000);    //  TIMESTAMP型をDate型に変換
//                 formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
//             }

//             let imageUrl = data.public_image_url || data.item_image;
//             if (!data.public_image_url) {
//                 const filePath = extractFilePath(data.item_image);
//                 if (filePath) {
//                     imageUrl = await makeFilePublic(filePath);
//                     await db.collection('items').doc(id).update({ public_image_url: imageUrl });
//                 }
//             }

//             return {
//                 id,
//                 name: data.name,
//                 price: data.price,
//                 launch: formattedDate,
//                 imageUrl,
//                 favorites: data.favorites,
//                 regions: data.regions,
//             };
//         }));
//         return res.json({ message: 'データ取得成功', items });
//     } catch (error) {
//         console.log(error);
//         res.status(500).send("エラーが発生しました");
//     }
// })

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
//  スクレイピング処理
app.get('/api/v1/scraping', async (req, res) => {
    addProducts();
    res.send("スクレイピングを完了しました")
})
//  利用コンビニ,住まいの地域,住まいの県登録
app.post('/api/v1/menu', async (req, res) => {
    //  利用コンビニ名,地域名,県名,ユーザID
    const { conveni, region, prefecture, uid } = req.body
    try {
        const userRef = await db.collection("users").doc(uid).get();
        if (userRef.exists) {
            // ユーザー情報を更新
            await userRef.ref.update({
                conveni: conveni,
                region: region,
                prefecture: prefecture
            });
            res.send("アップデートしました");
        } else {
            res.status(404).send("ユーザーが見つかりません");
        }
    } catch (error) {
        console.error("エラー:", error);
        res.status(500).send("エラーが発生しました");
    }

})

//  ホームページの商品表示
app.get('/api/v1/home', async (req, res) => {
    const { uid } = req.query;                            //    ユーザID
    const conveni = await getConveni(uid);                //    利用コンビニ名
    const favorites = getFavoritesFromConveni(conveni);   //    お気に入りコレクション名
    let productIds;      //  お気に入りした商品ID
    let productsDatas;   //  商品コレクションの各ドキュメント

    //  ユーザがお気に入りした商品IDを取得
    querySnapshots = await db.collection(favorites).where('user_id', '==', uid).get();
    productIds = querySnapshots.docs.map(snapshot => {
        const data = snapshot.data()
        const product_id = data.product_id;
        return product_id
    })
    //  利用コンビニ名に応じて表示するコンビニ商品を変更
    switch (conveni) {
        case "セブンイレブン":
            productsDatas = await getSevenElevenProducts();
            break;
        case "ローソン":
            productsDatas = await getLawsonProducts();
            break;
    }
    return res.json({ message: 'データ取得成功', productsDatas, productIds, conveni });
});

//  利用コンビニ更新
app.patch('/api/v1/update', async (req, res) => {
    const { uid, conveni } = req.body;
    try {
        userSnapshot = await db.collection("users").doc(uid).get();
        if (userSnapshot.exists) {
            await userSnapshot.ref.update({
                conveni: conveni,
            })
            // レスポンスを送信
            res.status(200).send(`利用コンビニを ${conveni} に変更しました`);
        }
        else {
            console.log('ユーザ情報取得に失敗しました');
            res.status(404).send('ユーザー情報が見つかりません');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('サーバーでエラーが発生しました');
    }
})

//  お気に入り登録
app.post('/api/v1/favorites/', async (req, res) => {
    const { uid, product_id } = req.body;       //  ユーザID,商品ID
    const conveni = await getConveni(uid);      //  利用コンビニ名
    const document_id = `${uid}_${product_id}`; //  保存するドキュメントID
    const products = getCollection(conveni);    //  商品コレクション名
    const favorites = getFavoritesFromProducts(products);           //  お気に入りコレクション名
    const favoriteRef = db.collection(favorites).doc(document_id);  //  お気に入り商品の保存先
    const productRef = db.collection(products).doc(product_id);     //  お気に入り登録数を増やす商品
    try {
        //  お気に入り登録
        await favoriteRef.create({
            user_id: uid,
            product_id: product_id,
        });
        //  お気に入り登録数を増加
        await productRef.update({
            favorites: FieldValue.increment(1),
        })
        res.status(201).send("お気に入りに追加しました");
    } catch (error) {
        res.status(500).send("お気に入り追加に失敗しました: " + error.message);
    }
})

//  お気に入り削除
app.delete('/api/v1/favorites', async (req, res) => {
    const { uid, product_id } = req.body;       //  ユーザID,商品ID
    const conveni = await getConveni(uid);      //  利用コンビニ名
    const document_id = `${uid}_${product_id}`; //  削除ドキュメントID
    const products = getCollection(conveni);    //  商品コレクション名
    const favorites = getFavoritesFromProducts(products);       //  お気に入りコレクション名
    const productRef = db.collection(products).doc(product_id); //  お気に入り登録数を減らす商品
    try {
        // お気に入り登録数を減らす
        await productRef.update({
            favorites: FieldValue.increment(-1),
        });
        // お気に入りを削除
        await db.collection(favorites).doc(document_id).delete();
        res.status(200).send("お気に入りを削除しました");
    } catch (error) {
        res.status(500).send("お気に入り削除に失敗しました: " + error.message);
    }
})
app.listen(PORT, () => { console.log(`http://localhost:${PORT}`) });
